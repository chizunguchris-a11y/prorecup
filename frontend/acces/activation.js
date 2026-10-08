(function(){
    "use strict";
    const form=document.getElementById("activation"), message=document.getElementById("activation-message");
    const token=new URLSearchParams(location.hash.slice(1)).get("token")||"";
    history.replaceState(null,"",location.pathname);
    const destinations={backoffice:"../index.html",portail_client:"../portail-client/index.html",agent_terrain:"../../agent-app/index.html"};
    const show=(text,error,produit)=>{message.replaceChildren();message.hidden=false;message.classList.toggle("is-error",!!error);message.append(document.createTextNode(text));if(!error&&destinations[produit]){const link=document.createElement("a");link.className="primary-button";link.href=destinations[produit];link.textContent="Se connecter";message.append(document.createElement("br"),link);}};
    if(!/^[a-f0-9]{64}$/.test(token)){form.hidden=true;show("Le lien est incomplet ou invalide. Contactez la personne qui vous a invité.",true);return;}
    form.addEventListener("submit",async event=>{event.preventDefault();if(!form.reportValidity())return;const data=Object.fromEntries(new FormData(form));if(data.nouveauMotDePasse!==data.confirmationMotDePasse){show("Les mots de passe ne correspondent pas.",true);return;}const button=form.querySelector("button");button.disabled=true;try{const response=await fetch(window.PRORECUP_API_URL+"/api/identity/invitations/activate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,token}),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw new Error(result.error||result.message);form.reset();form.hidden=true;show(result.message,false,result.produit);}catch(error){show(error.message||"Activation impossible pour le moment.",true);}finally{button.disabled=false;}});
}());
