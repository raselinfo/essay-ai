import { createClient } from "@supabase/supabase-js"
import { ParsedEvent,ReconnectInterval,createParser } from "eventsource-parser"

export const supabaseAdmin=createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const OpenAIStream=async(prompt:string,apikey:string)=>{
    console.log(prompt)
    // this is the openai completions call
    const response=await fetch("https://api.openai.com/v1/chat/completions",{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${apikey}`
        },
        body:JSON.stringify({
            model:"gpt-3.5-turbo",
            messages:[
            {
                role:'user',
                content:`You should accurately answers queries using Paul Graham's essays. Use the text provided to form your answer, but avoid copying word-for-word from the essays. Try to use your own words when possible. Be accurate, helpful, concise, and clear. After every main heading put an emoji based on heading text.
                
                And Please generate a markdown  text with a heading, a paragraph, order list, unorderlist and use  and italic to highlight important information.but don't use thies keywork like orderlist,unorderlist etc.
                
                To generate markdown use the following content but don't use avobe text. thoese text are just example.: 
                ${prompt}`
            }
        ],
        max_tokens:500,
        temperature: 0.5,
        stream:true
        })

    })

    if(response.status !==200){
        throw new Error("Error")
    }

    const encoder=new TextEncoder()
    const decoder= new TextDecoder()

    const stream=new ReadableStream({
        async start(controller){
            // this is the eventsource parser that parses the stream into events
            // it is a fork of the eventsource-parser library
            const onParse= (event:ParsedEvent | ReconnectInterval)=>{
                if(event.type==='event'){
                    const data=event.data
                    if(data==="[DONE]"){
                        controller.close()
                        return;
                    }
                    try{
                        const json = JSON.parse(data)
                        // const text=controller.enqueue(json.choices[0].text)
                        const text=json.choices[0].delta.content
                        const queue=encoder.encode(text!)
                        controller.enqueue(queue)
                    }catch(err){
                        controller.error(err)
                    }
                }
            };
            const parser=createParser(onParse)
            for await(const chunk of response.body as any){
                parser.feed(decoder.decode(chunk))
            }
        }
    })
    return stream
}

