import fs from "fs"
import axios from "axios"
import * as cheerio from "cheerio"
import {encode} from "gpt-3-encoder"
let CHUNK_SIZE=200
interface EssayType{
    title:string,
    url:string,
    date:string,
    thanks:string,
    content:string,
    length:number,
    tokens:number,
    chunks:[]
}


const base_url:string="http://www.paulgraham.com"

// step 1: get all the links from the articles page
const getLinks=async()=>{

    const linksArr:{url:string,title:string}[]=[]

    const html=await axios.get(`${base_url}/articles.html`)
    const $=cheerio.load(html.data)
    const tables=$('table')
    const second_table=tables[2]
    const links=$(second_table).find('a')
    links.each((i,link)=>{
       const url=$(link).attr('href')
       const title=$(link).text()
       if(url &&  url.endsWith('.html')){
            const linkObj={
                url,
                title
            }
            linksArr.push(linkObj)
       }
    })

    return linksArr
}


// step 2: get the essay from the link
const getEssay=async(link:{title:string,url:string})=>{
    const {title,url}=link
    // write only types of essay   
    
    let essay={
        title:"",
        url:"",
        date:"",
        thanks:"",
        content:"",
        length:0,
        tokens:0,
        chunks:[]
    }
    const fullLink=`${base_url}/${url}`
    const html=await axios.get(fullLink)
    const $=cheerio.load(html.data)
    const table=$('table')[1]
    const text=$(table).text()
    // here are some text pre-processing steps like:
    // 1- remove all the white spaces
    // 2- add a space after every dot
    // 3- get the date
    let cleanText=text.replace(/\s+/g," ")
    cleanText=cleanText.replace(/\.([a-zA-Z])/g,". $1")
    const date = cleanText.match(/([A-Z][a-z]+ [\d]{4})/);

    // get the date and remove it from the text
    let dateStr=""
    let textWithoutDate=""
    if(date){
        dateStr=date[0]
        textWithoutDate=cleanText.replace(date[0],"")
    }
    // remove the new lines from the text
    let essayText=textWithoutDate.replace(/\n/g,"")
    
    // it just get the last sentence and check if it starts with "Thanks to" and then check if it ends
    // with a dot or not, if not then add a dot at the end
    // so thanksTo= "Thanks to" + the last sentence
    let thanksTo=""
    const split=essayText.split(". ")
    const lastSentence=split[split.length-1]
    if(lastSentence && lastSentence.startsWith("Thanks to")){
        const thanksToSplit=lastSentence.split("Thanks to")
        if(thanksToSplit[1].trim()[thanksToSplit[1].trim().length -1]==="."){
            thanksTo="Thanks To "+thanksToSplit[1].trim()
        }else{
            thanksTo="Thanks To "+thanksToSplit[1].trim()+"."
        }

        essayText=essayText.replace(thanksTo,"")
    }
    const trimmedContent=essayText.trim()
    essay={
        title,
        url:fullLink,
        date:dateStr,
        thanks:thanksTo.trim(),
        content:trimmedContent,
        length:trimmedContent.length,
        tokens:encode(trimmedContent).length,
        chunks:[]
    }

    return essay
}


// step: 3 Chunk the essay
// this function will chunk the essay into chunks of 200 tokens
// and return an array of chunks
// if the essay is less than 200 tokens then it will return an array with one element which is the essay
// if the essay is more than 200 tokens then it will return an array of chunks
const chunkEssay=async(essay:any)=>{
    const {title,url,date,thanks,content,...chunklessSection}=essay

    let essayTextChunk=[]
    
    // if the essay is more than 200 tokens then chunk it
    // if the essay is less than 200 tokens then return an array with one element which is the essay
    // the chunking algorithm is very simple, it will split the essay into sentences and then add the sentences
    if(chunklessSection.tokens > CHUNK_SIZE){
        const split=content.split(". ")
        let chunkText=""
        
        // loop over the sentences and add them to the chunkText
        // if the chunkText is more than 200 tokens then push the chunkText to the essayTextChunk array
        // and then reset the chunkText to an empty string
        // if the sentence ends with a dot then add a space after the dot
        // if the sentence doesn't end with a dot then add a dot at the end of the sentence
        // and then add a space after the dot
        // this is done to make sure that the sentences are separated by a dot and a space
        // and the last sentence doesn't end with a dot
        split.forEach((sentence:string,index:any)=>{
            const sentenceTokenLength=encode(sentence).length
            const chunkTextTokenLength=encode(chunkText).length
           

                if(chunkTextTokenLength+sentenceTokenLength > CHUNK_SIZE){
                    essayTextChunk.push(sentence) 
                     chunkText=""     
                 }
                 // if the sentence ends with a dot then add a space after the dot
                 // if the sentence doesn't end with a dot then add a dot at the end of the sentence
                 if(sentence[sentence.length-1].match(/[a-z0-9]/i)){
                     chunkText+=sentence+". "              
                 }else{     
                    chunkText+=sentence+" "
                }          
           
        })
        
        essayTextChunk.push(chunkText)
    }else{
        essayTextChunk.push(content)
    }
    // map over the essayTextChunk array and create an object for each chunk
    // the object will have the essay title, essay url, essay thanks, content, content length, content token length, and embedding
    // the embedding will be an empty array for now and will be filled later
    // the embedding is the vector representation of the essay chunk
    const essayChunks=essayTextChunk.map((text)=>{
       const trimmedText=text.trim()
       const chunk={
        essay_title:title,
        essay_url:url,
        essay_thanks:thanks,
        content:trimmedText,
        content_length:trimmedText.length,
        content_token:encode(trimmedText).length,
        embedding:[]
       }
       return chunk
    })

    // if the essay is more than 200 tokens then we need to merge the last two chunks
    // if the last chunk is less than 100 tokens then merge it with the previous chunk
    // and then remove the last chunk from the essayChunks array
    if(essayChunks.length >1){
        essayChunks.forEach((chunk,index)=>{
            const prevChunk=essayChunks[index-1]

            if(chunk.content_token < 100 && prevChunk){
                prevChunk.content+=" "+chunk.content;
                prevChunk.content_length+=prevChunk.content.length
                prevChunk.content_token+=chunk.content_token
                essayChunks.splice(index,1)
                index--
            }
        })
    }

    const chunkedSection={
        ...essay,
        chunks:essayChunks
    }
return chunkedSection
    
}

(async()=>{
    let essays:any=[]
    // Step 1: get all the links from the articles page
   const links=await getLinks()
//    links.forEach(async(link)=>{
//     const essay=await getEssay(link)
//     const chunkedEssay=await chunkEssay(essay)
//     essays.push(chunkedEssay)
//    })
for(let i=0;i<links.length;i++){
    const essay=await getEssay(links[i])
    const chunkedEssay=await chunkEssay(essay)
    essays.push(chunkedEssay)
}
// console.log(essays)

   const json={
    current_data:new Date().toLocaleDateString(),
    author:"Paul Graham",
    url:"http://www.paulgraham.com/articles.html",
    length: essays.reduce((acc:any,assay:any)=>acc+assay.length,0),
    token:essays.reduce((acc:any,assay:any)=>acc+assay.tokens,0),
    essays
   }
   fs.writeFileSync("scripts/pg.json",JSON.stringify(json))
})()
