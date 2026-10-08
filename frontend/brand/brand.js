(function(){
    "use strict";
    const script=document.currentScript;
    const base=new URL("./",script.src);
    // Set these paths only after human approval of the official assets.
    const brand=Object.freeze({name:"Pro Récup",horizontal:null,light:null,dark:null,monochrome:null,symbol:null});
    window.ProRecupBrand=brand;
    for(const el of document.querySelectorAll("[data-brand]")){
        if(brand.horizontal){const image=document.createElement("img");image.src=new URL(brand.horizontal,base);image.alt=brand.name;image.width=180;image.height=48;el.replaceChildren(image);}else el.textContent=brand.name;
    }
    if(!document.querySelector('link[rel="icon"]')){const icon=document.createElement("link");icon.rel="icon";icon.type="image/svg+xml";icon.href=new URL("favicon.svg",base);document.head.append(icon);}
}());
