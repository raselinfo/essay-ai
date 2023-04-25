// Chunk the content
        const {content,tokens,date,thanks}=essay
        const essayTextChunk=[]
        if(tokens> CHUNK_SIZE){
            const splitContent=content.split(". ")
            let chunkTexts=""
            splitContent.forEach((sentence:string,index:number)=>{
                const sentenceTokenLength=encode(sentence).length
                const chunksTextTokenLength=encode(chunkTexts).length

                if(sentenceTokenLength+chunksTextTokenLength> CHUNK_SIZE){
                    essayTextChunk.push(sentence)
                    chunkTexts=""
                }

                if(!/[a-z0-9]/i.test(sentence[sentence.length-1])){
                    chunkTexts+=sentence+" "
                }else{
                    chunkTexts+=sentence+". "
                }
            })
            essayTextChunk.push(chunkTexts.trim())
        }else{
            essayTextChunk.push(content.trim())
        }
        
        // Create Chunk Object
        const essayChunks=essayTextChunk.map((text:string)=>{
            return {
                essay_title:title,
                essay_url:url,
                essay_date:date,
                essay_thanks:thanks,
                content:text.trim(),
                content_length:text.trim().length,
                content_token:encode(text.trim()).length,
            }
        })
        
        
        if(essayChunks.length){
            for(let i=0;i<essayChunks.length;i++){
                const currentChunk=essayChunks[i]
                const prevChunk=essayChunks[i-1]
                if(currentChunk.content_token<100 && prevChunk?.content_token<200){
                    prevChunk.content+=" "+currentChunk.content
                    prevChunk.content_length+=currentChunk.content_length
                    prevChunk.content_token+=currentChunk.content_token
                    essayChunks.splice(i,1)
                    i--
                }
            }
            
        }


        const essayWithChunks={
            ...essay,
            chunks:essayChunks
        }
        essays.push(essayWithChunks)