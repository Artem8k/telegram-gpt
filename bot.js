import { Telegraf } from "telegraf";
import "dotenv/config";
import { message } from "telegraf/filters";
import { ChatGPTAPI } from "chatgpt";
import { read, readFile, writeFile } from "fs";

const bot = new Telegraf(process.env.BOT_KEY ?? "");

const gptApi = new ChatGPTAPI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  completionParams: {
    temperature: 0.2,
  }
})

bot.on(message("text"), async (ctx) => {
  let gptResp
  if (ctx.message.text.startsWith(`@${ctx.botInfo.username}`)) {
    const requestString = ctx.message.text
      .replace(`@${ctx.botInfo.username}`, "")
      .trim();

    gptResp = await gptApi.sendMessage(requestString);
    const tgRes = await ctx.telegram.sendMessage(
      ctx.message.chat.id,
      gptResp.text,
      { message_thread_id: ctx.message.message_thread_id }
    );

    const questionObject = {
      id: tgRes.message_id,
      gptDialogBranch: gptResp.id
    }

    JSON.stringify(questionObject)

    readFile('questions.json', 'utf-8', async (err, data) => {
      if (err) {
        await ctx.telegram.sendMessage(
          ctx.message.chat.id,
          err.message,
          { message_thread_id: ctx.message.message_thread_id }
        );
      } else {
        const obj = JSON.parse(data)
        obj.push(questionObject)
        writeFile('questions.json', JSON.stringify(obj), async (err) => {
          if (err) {
            await ctx.telegram.sendMessage(
              ctx.message.chat.id,
              err.message,
              { message_thread_id: ctx.message.message_thread_id }
            );
          }
        })
      }
    })
  }
  else if (ctx.update.message.reply_to_message.from.username === 'VseInstrumentiGPTBot') {
    readFile('questions.json', 'utf-8', async (err, data) => {
      if (err) {
        await ctx.telegram.sendMessage(
          ctx.message.chat.id,
          err.message,
          { message_thread_id: ctx.message.message_thread_id }
        );
      } else {
        const obj = JSON.parse(data)
        const json = Array.from(obj)
        const repliedMessage = json.filter(value => { return value.id === ctx.update.message.reply_to_message.message_id })
        const requestString = ctx.message.text
          .replace(`@${ctx.botInfo.username}`, "")
          .trim();
        const gptResp = await gptApi.sendMessage(requestString, {
          parentMessageId: repliedMessage[0].gptDialogBranch
        });
        const tgRes = await ctx.reply(gptResp.text, { reply_to_message_id: ctx.message.message_id })

        const questionObject = {
          id: tgRes.message_id,
          gptDialogBranch: gptResp.id,
        }

        readFile('questions.json', 'utf-8', async (err, data) => {
          if (err) {
            await ctx.telegram.sendMessage(
              ctx.message.chat.id,
              err.message,
              { message_thread_id: ctx.message.message_thread_id }
            );
          } else {
            const obj = JSON.parse(data)
            obj.push(questionObject)
            writeFile('questions.json', JSON.stringify(obj), async (err) => {
              if (err) {
                await ctx.telegram.sendMessage(
                  ctx.message.chat.id,
                  err.message,
                  { message_thread_id: ctx.message.message_thread_id }
                );
              }
            })
          }
        })
      }
    })
  }
});

console.log(123)
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
