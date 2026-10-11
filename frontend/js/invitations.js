(function(){
    "use strict";
    if(!ProRecup.protegerPage())return;
    const form=document.getElementById("invitation"),result=document.getElementById("result"),role=document.getElementById("role");
    const user=ProRecup.obtenirUtilisateur(),isAdmin=(user?.role||user?.role_nom)==="admin";
    if(!isAdmin)Array.from(role.options).filter(o=>o.value!=="agent_valorisation_carbone").forEach(o=>o.remove());
    const show=data=>{
        result.replaceChildren();result.hidden=false;
        const text=document.createElement("p");
        text.textContent=data.message||(data.code==="EMAIL_SENT"?"Invitation envoyée.":data.lienInvitation?"L'e-mail n'a pas été envoyé par Resend. Copiez ce lien personnel et transmettez-le au collaborateur. Il expire dans 48 heures.":"Invitation créée, mais l'e-mail n'a pas été envoyé. Configurez le fournisseur puis utilisez Nouvelle invitation.");
        result.append(text);
        if(isAdmin&&data.statut==="invitation_non_envoyee"&&typeof data.lienInvitation==="string"){
            const button=document.createElement("button"),copyStatus=document.createElement("p");
            button.type="button";button.textContent="Copier le lien d'activation";
            copyStatus.setAttribute("aria-live","polite");
            button.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(data.lienInvitation);copyStatus.textContent="Lien d'activation copié.";}catch{copyStatus.textContent="Copie impossible. Réessayez depuis un navigateur autorisant le presse-papiers.";}});
            result.append(button,copyStatus);
        }
    };
    const load=async()=>{try{const r=await ProRecup.requete("/api/identity/invitations");const list=document.getElementById("pending");list.replaceChildren();for(const u of r.data){const row=document.createElement("p");row.textContent=u.nom+" · "+u.email+" · "+u.statut+" ";const actions=u.statut==="utilisee"?[]:u.statut==="annulee"?["renew"]:["renew","cancel"];for(const action of actions){const b=document.createElement("button");b.textContent=action==="renew"?"Nouvelle invitation":"Annuler";b.addEventListener("click",async()=>{b.disabled=true;try{const r=await ProRecup.requete(`/api/identity/invitations/${u.id}/${action}`,{method:"POST",body:"{}"});show(r.data);await load();}catch(e){show({message:e.message});}finally{b.disabled=false;}});row.append(b);}list.append(row);}}catch(e){show({message:e.message});}};
    role.addEventListener("change",async()=>{const field=document.getElementById("client-field");field.hidden=role.value!=="client";if(!field.hidden){try{const r=await ProRecup.requete("/api/clients");const select=document.getElementById("clientId");select.replaceChildren();for(const c of r.data||[]){const o=document.createElement("option");o.value=c.id;o.textContent=c.nom;select.append(o);}}catch(e){show({message:e.message});}}});
    form.addEventListener("submit",async e=>{e.preventDefault();if(!form.reportValidity())return;const button=form.querySelector("button");button.disabled=true;const data=Object.fromEntries(new FormData(form));if(data.role!=="client")delete data.clientId;try{const r=await ProRecup.requete("/api/identity/invitations",{method:"POST",body:JSON.stringify(data)});show(r.data);form.reset();await load();}catch(error){show({message:error.message});}finally{button.disabled=false;}});load();
}());
