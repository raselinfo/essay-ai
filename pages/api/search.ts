import { supabaseAdmin } from "@/utils";

export const config = {
  runtime: "edge"
};
const handler = async (req: Request): Promise<Response> => {
  try {
    const {query,apiKey=process.env.OPENAI_API_KEY,matches=5} = (await req.json()) as {
      query: string;
      apiKey: string;
      matches: number;
    };

    // this is replacing all new lines with spaces
    const input = query.replace(/\n/g, " ");
    
    const res=await fetch(`https://api.openai.com/v1/embeddings`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${apiKey}`
      },
      body:JSON.stringify({
        model:'text-embedding-ada-002',
        input
      })
    })

    const json=await res.json()
    const embedding=json.data[0].embedding;

    // this is the RPC call to the supabase function
    const {data:chunks,error}=await supabaseAdmin.rpc("paul_graham_search",{
      query_embedding:embedding,
      // this is the threshold for similarity
      // the lower the number the more similar the results
      // the higher the number the less similar the results
      // 0.001 is a good number for a more specific search
      similarity_threshold:0.01,
      match_count:matches
    })
    if(error){
      console.log(error)
      return new Response("Error", { status: 500 });
    }

    return new Response(JSON.stringify(chunks), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("Error", { status: 500 });
  }
};

export default handler;
