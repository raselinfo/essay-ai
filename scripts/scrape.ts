import fs from "fs"
import cheerio from "cheerio"
import axios from "axios"
import { ChunkType, EssayType, LinkType } from "@/types/types"
import preProcessing from "@/utils"
import { encode } from "gpt-3-encoder"
const $$ = cheerio.load
const baseURL: string = 'http://www.paulgraham.com'.trim()


const getLinks = async () => {
    try {
        const res = await axios.get(`${baseURL}/articles.html`)
        const getHtml = $$(res.data)
        const table = getHtml('table')[2]
        const links = getHtml(table).find('a')

        const linksArr: LinkType[] = []

        links.each((_, link) => {
            const url = getHtml(link).attr('href')?.trim()
            const text = getHtml(link).text().trim()
            const linksObj: LinkType = { title: "", url: "", thirdParty: false }
            if (!url?.endsWith('.html')) {
                if (url && text) {
                    linksObj.title = text
                    linksObj.url = url
                    linksObj.thirdParty = true
                }
            } else {
                const fullURL = `${baseURL}/${url}`
                linksObj.title = text
                linksObj.url = fullURL
            }
            linksArr.push(linksObj)
        })
        return linksArr
    } catch (err) {
        throw new Error((err as { message: string }).message)
    }
}


// Get Essays
const getEssays = async (links: LinkType[]) => {
    const essays: any = []
    const CHUNK_SIZE = 200
    for (let i = 0; i < links.length; i++) {
        const linkObj = links[i]
        const { url, title } = linkObj
        const res = await axios.get(url)
        const getHtml = $$(res.data)
        const table = getHtml('table')[1]
        let essay: EssayType = {
            title: "",
            date: "",
            length: 0,
            thanks: "",
            tokens: 0,
            url: "",
            content: ""
        }
        if (!table) {
            const text = getHtml.text()
            essay = {
                title,
                url,
                ...preProcessing(text),
            }
        } else {
            const text = getHtml(table).text()
            essay = {
                title,
                url,
                ...preProcessing(text),
            }
        }

        // Chunk the content
        const { content, tokens, date, thanks } = essay
        const essayTextChunks = []
        // 🤣🤬✅
        if (tokens > CHUNK_SIZE) {
            const splitContent = content.split(". ");
            let chunkText = "";

            for (let i = 0; i < splitContent.length; i++) {
                const sentence = splitContent[i];
                const sentenceTokenLength = encode(sentence).length;
                const chunkTextTokenLength = encode(chunkText).length;

                if (chunkTextTokenLength + sentenceTokenLength > CHUNK_SIZE) {
                    essayTextChunks.push(chunkText);
                    chunkText = "";
                }

                if(!/[a-z0-9]/i.test(sentence[sentence.length-1])){
                    chunkText+=sentence+" "
                }else{
                    chunkText+=sentence+". "
                }
            }

            essayTextChunks.push(chunkText.trim());
        } else {
            essayTextChunks.push(content.trim());
        }


        // 🤣🤬✅

        // Create Chunk Object
        const essayChunks = essayTextChunks.map((text) => {
            const trimmedText = text.trim();

            return {
                essay_title: title,
                essay_url: url,
                essay_date: date,
                essay_thanks: thanks,
                content: trimmedText,
                content_length: trimmedText.length,
                content_tokens: encode(trimmedText).length,
                embedding: []
            };


        });

        // Changed
        if (essayChunks.length > 1) {
            for (let i = 0; i < essayChunks.length; i++) {
                const chunk = essayChunks[i];
                const prevChunk = essayChunks[i - 1];
                if (chunk.content_tokens < 100 && prevChunk) {
                    prevChunk.content += " " + chunk.content;
                    prevChunk.content_length += chunk.content_length;
                    prevChunk.content_tokens += chunk.content_tokens;
                    essayChunks.splice(i, 1);
                    i--;
                }
            }

        }


        const essayWithChunk = {
            ...essay,
            chunks: essayChunks
        };
        essays.push(essayWithChunk)
    }

    return essays
}


// const test=async()=>{
//     try{
//         const res=await axios.get('https://sep.turbifycdn.com/ty/cdn/paulgraham/acl2.txt?t=1681984801&')
//         console.log(res.data)
//     }catch(err){
//         console.log(err)
//     }
// }



(async () => {
    // test()
    try {
        const links = await getLinks()
        const essays = await getEssays(links)

        const json = {
            current_date: "2023-03-01",
            author: "Paul Graham",
            url: "http://www.paulgraham.com/articles.html",
            length: essays.reduce((acc: any, essay: any) => acc + essay.length, 0),
            tokens: essays.reduce((acc: any, essay: any) => acc + essay.tokens, 0),
            essays
        };

        fs.writeFileSync("scripts/pg.json", JSON.stringify(json));


    } catch (err) {
        console.log((err as { message: string }).message)
    }
})()