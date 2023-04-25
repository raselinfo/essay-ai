export interface LinkType{
    title:string;
    url:string;
    thirdParty:boolean
}

export interface EssayType{
    title:string;
    date:string;
    length:number;
    thanks:string;
    tokens:number;
    url:string;
    content:string;

}

export interface ChunkType{
    essay_title:string;
    essay_url:string;
    essay_date:string;
    essay_thanks:string;
    content:string;
    content_length:number,
    content_token:number,
}
