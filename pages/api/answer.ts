import { OpenAIStream } from "@/utils"

export const config={
    runtime:"edge"
}
console.log(process.env.OPENAI_API_KEY)
const handler=async(req:Request):Promise<Response>=>{
    try{
        const {prompt,apiKey=process.env.OPENAI_API_KEY}=(await req.json()) as {
            prompt:string,
            apiKey:string,
        }

        const stream =await OpenAIStream(prompt,apiKey!)

        return new Response(stream,{status:200})
    }catch(err:any){
        console.log(err.message)
        return new Response(err.message,{status:500})
    }
}

export default handler