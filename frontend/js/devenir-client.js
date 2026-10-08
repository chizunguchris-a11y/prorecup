(function () {
    "use strict";
    const form=document.getElementById("form-onboarding");
    const message=document.getElementById("message");
    const api=String(window.PRORECUP_API_URL||"https://prorecup-backend.onrender.com").replace(/\/+$/,"");
    const afficher=function(texte,erreur){message.textContent=texte;message.classList.toggle("is-error",Boolean(erreur));message.hidden=false;};
    form.addEventListener("submit",async function(event){
        event.preventDefault();
        if(!form.reportValidity())return;
        const bouton=form.querySelector("button[type=submit]");
        bouton.disabled=true;message.hidden=true;
        const controleur=new AbortController();
        const minuteur=window.setTimeout(function(){controleur.abort();},12000);
        try{
            const donnees=Object.fromEntries(new FormData(form).entries());
            const reponse=await fetch(api+"/api/onboarding/client",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(donnees),signal:controleur.signal});
            const resultat=await reponse.json().catch(function(){return {};});
            if(!reponse.ok)throw new Error(resultat.error||resultat.message||"La demande n'a pas pu être enregistrée.");
            form.reset();
            afficher("Votre demande a été reçue. L'équipe Pro Récup vérifiera les informations avant toute création d'espace.",false);
        }catch(erreur){afficher(erreur.name==="AbortError"?"Le service met trop de temps à répondre. Réessayez dans un instant.":erreur.message,true);}
        finally{window.clearTimeout(minuteur);bouton.disabled=false;}
    });
}());
