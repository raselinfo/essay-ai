import {encode} from "gpt-3-encoder"
const preProcessing=(text:string)=>{
    
    let cleanText=text.replace(/\s+/g," ")
    cleanText=cleanText.replace(/\.([a-zA-Z])/g,". $1")
    let date =cleanText.match(/([A-Z][a-z]+ [\d]{4})/)
    let dateString=""
    if(date){
        dateString=date[0]
        cleanText=cleanText.replace(dateString,"")
    }
    cleanText=cleanText.replace(/ {2}/g," ")
    cleanText=cleanText.replaceAll(/\n/g,"").trim()
    if(!/\.$/.test(cleanText)){
        cleanText+="."
    }
    let essayText:string=cleanText.trim()
    let thanksTo=""
    const sentences=essayText.split(". ")
    const lastSentence=sentences[sentences.length-1].trim()
    if(lastSentence && lastSentence.startsWith("Thanks to")){
        const splitThanksTo=lastSentence.split("Thanks to")
        if(splitThanksTo[1].trim()[splitThanksTo[1].trim().length-1]!=="."){
            thanksTo=`Thanks to ${splitThanksTo[1].trim()}.`
        }else{
            thanksTo=`Thanks to ${splitThanksTo[1].trim()}`
        }
      
    }
    essayText=essayText.replace(thanksTo.trim(),"").trim()
    
    return {
        date:dateString,
        thanks:thanksTo.trim(),
        content:essayText,
        length:essayText.length,
        tokens:encode(essayText).length
    }
}

export default preProcessing