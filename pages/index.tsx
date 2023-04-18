import ReactMarkdown from "react-markdown"
import Head from 'next/head'
import Image from 'next/image'
import styles from '@/styles/Home.module.css'
import { FormEvent, useState } from 'react'
import endent from 'endent'
import remarkGfm from 'remark-gfm'

export default function Home() {
  const [query,setQuery]=useState("")
  const [answer,setAnswer]=useState("")
  const [chunk,setChunk]=useState([])
  const [loading,setLoading]=useState(false)


  const handleStream=async(query:any)=>{
    setChunk([])
    setAnswer('')
    setLoading(true)  
    // Search API
    const serachResponse=await fetch('/api/search',{
      method:"POST",
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({query}),
    })
    if(!serachResponse.ok){
      setLoading(false)
      return;
    }
    const results=await serachResponse.json()
   
    // Answer API
    const prompt=endent`
    Use the following passages to answer the query: ${query}
               
    ${results.map((chunk:any)=>chunk.content).join('\n')}
    `
    const answerResponse=await fetch('/api/answer',{
      method:"POST",
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({prompt}),
    })
     
    if(!answerResponse.ok){
      setLoading(false)
      return;
    }
    const data= await answerResponse.body
    if(!data){
      return;
    }
    setLoading(false)

    const reader=data.getReader()
    const decoder=new TextDecoder()
    let done=false
    while(!done){
     const {value,done:doneReading}=await reader.read();
     done=doneReading
     const chunkValue=decoder.decode(value)
    setAnswer((prev)=>prev+chunkValue)
    }
    setChunk(results)
  }
  

  const handleSearch=(e:FormEvent)=>{
    e.preventDefault()
    handleStream(query)
  }

  const handleSuggestion=(data:any)=>{
    setQuery(data)
    handleStream(data)
  }
  const handleRetry=()=>{
    handleStream(query)
  }

  

  return (
    <>
     <Head>
      <title>Doc GPT</title>
     </Head>
     <h1>We use <a className="text-blue-500" href="http://www.paulgraham.com/articles.html">Paul Graham assyas</a> to train our ai</h1>
     <div className="flex gap-10">
    <div>
    <form onSubmit={handleSearch} className="flex flex-col gap-5">
    <textarea
      className='border-2 border-gray-300 bg-white h-72 px-5 pr-16 rounded-lg text-sm focus:outline-none
        
      ' 
      placeholder='Ask your question.'
         value={query} onChange={(e)=>setQuery(e.target.value)}/>
    <div className="flex gap-5 items-center">
    <button  className="rounded w-full  bg-blue-500 p-1 hover:cursor-pointer hover:bg-blue-600 text-white">Ask</button>
    <button onClick={handleRetry} type="button" className="rounded w-full bg-blue-500 p-1 hover:cursor-pointer hover:bg-blue-600 text-white">Retry 🔁</button>
    </div>
    </form>
    {/* Suggestion */}
    <div className="mt-5">
      {
        chunk && chunk?.map((sg:any,index:number)=>{
          if(Boolean(chunk[index-1])){
            if((chunk[index-1] as {essay_title:string}).essay_title!==sg.essay_title && index!==0){
              return   <div onClick={()=>handleSuggestion(sg.essay_title)} key={index} className="mb-2 bg-gray-100 py-2 px-3 rounded-lg">
              <h1 className="text-sm text-blue-500 underline cursor-pointer">{sg.essay_title}</h1>
            </div>
            }
          }
         
          return false         
        })
      }
    
    </div>
    </div>
    <div className='mt-4 overflow-y-auto h-[80vh]'>
 
      {
        loading ? <div> <img src="https://media.tenor.com/qACzaJ1EBVYAAAAM/loading-cat-loading.gif"  alt="loading..."/></div> : <ReactMarkdown
        // allowedElements={['p','span','h1','h2','h3','ol','ul','li']}
        remarkPlugins={[remarkGfm]}    
        components={{ 
          strong:({children})=> (<strong style={{color:'#ffa000',fontStyle:'italic'}}>{children}</strong>)        
        }}
        >{"\n\n"+answer+"\n"}</ReactMarkdown>
      }
      <br/>
    </div>
     </div>
    </>
  )
}

