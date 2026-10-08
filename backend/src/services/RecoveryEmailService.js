const baseFrontend = () => {

    return String(
        process.env.PRORECUP_FRONTEND_URL ||
        "https://prorecup-frontend.onrender.com"
    )
        .trim()
        .replace(
            /\/+$/,
            ""
        );

};


class RecoveryEmailService {

    lien(page, token) {
        const url = new URL(baseFrontend() + "/acces/" + page);
        if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("HTTPS requis pour les liens transactionnels.");
        url.hash = "token=" + encodeURIComponent(token);
        return url.toString();
    }

    async envoyerTransaction({email,nom,lien,subject,texte,bouton}) {
        const key = String(process.env.RESEND_API_KEY || "").trim();
        if (!key) return {sent:false,code:"EMAIL_PROVIDER_NOT_CONFIGURED"};
        const escape = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
        const text = `Bonjour ${nom || ""},\n\n${texte}\n\n${lien}\n\nPro Récup`;
        const html = `<div style="font-family:Segoe UI,Arial,sans-serif;color:#17211C;max-width:560px;margin:auto"><h2>Pro Récup</h2><p>Bonjour ${escape(nom || "")},</p><p>${escape(texte)}</p><p><a style="background:#176B4D;color:white;padding:12px 18px;display:inline-block;text-decoration:none" href="${escape(lien)}">${escape(bouton)}</a></p><p>Si vous n'attendiez pas ce message, contactez notre équipe.</p></div>`;
        try {
            const response = await fetch("https://api.resend.com/emails", {method:"POST",signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.PRORECUP_EMAIL_FROM || "Pro Récup <no-reply@prorecup.com>",reply_to:process.env.PRORECUP_SUPPORT_EMAIL || "support@prorecup.com",to:[email],subject,text,html})});
            return {sent:response.ok,code:response.ok?"EMAIL_SENT":"EMAIL_PROVIDER_ERROR"};
        } catch { return {sent:false,code:"EMAIL_PROVIDER_UNAVAILABLE"}; }
    }

    async envoyerLienMotDePasse(
        {
            email,
            nom,
            token
        }
    ) {

        const apiKey =
            String(
                process.env.RESEND_API_KEY ||
                ""
            ).trim();


        const from =
            String(
                process.env.PRORECUP_EMAIL_FROM ||
                "Pro Recup <no-reply@prorecup.com>"
            ).trim();


        const replyTo =
            String(
                process.env.PRORECUP_SUPPORT_EMAIL ||
                "support@prorecup.com"
            ).trim();


        if (
            !apiKey ||
            !from
        ) {

            return {
                sent: false,
                reason:
                    "not_configured"
            };

        }


        const lien =
            baseFrontend() +
            "/acces/reinitialiser.html?token=" +
            encodeURIComponent(
                token
            );


        const salutation =
            String(
                nom || ""
            ).trim()
                ? (
                    "Bonjour " +
                    String(
                        nom
                    ).trim() +
                    ","
                )
                : "Bonjour,";


        const texte = [
            salutation,
            "",
            "Une demande de recuperation de votre acces Pro Recup a ete recue.",
            "",
            "Ce lien est valable pendant 30 minutes :",
            lien,
            "",
            "Si vous n'etes pas a l'origine de cette demande, ignorez ce message.",
            "",
            "Pro Recup"
        ].join(
            "\n"
        );


        const html =
            [
                '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17211C">',
                '<h2 style="color:#176B4D">Pro R&eacute;cup</h2>',
                "<p>" +
                    salutation +
                    "</p>",
                "<p>Une demande de r&eacute;cup&eacute;ration de votre acc&egrave;s a &eacute;t&eacute; re&ccedil;ue.</p>",
                "<p>Le lien est valable pendant <strong>30 minutes</strong>.</p>",
                '<p><a href="' +
                    lien +
                    '" style="display:inline-block;padding:12px 18px;background:#176B4D;color:#fff;text-decoration:none;border-radius:8px">R&eacute;initialiser mon mot de passe</a></p>',
                '<p style="color:#66736D;font-size:14px">Si vous n&apos;&ecirc;tes pas &agrave; l&apos;origine de cette demande, ignorez ce message.</p>',
                "</div>"
            ].join(
                ""
            );


        try {

            const reponse =
                await fetch(
                    "https://api.resend.com/emails",
                    {
                        method:
                            "POST",

                        headers: {
                            Authorization:
                                "Bearer " +
                                apiKey,

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                from,
                                to: [
                                    email
                                ],
                                subject:
                                    "Recuperation de votre acces Pro Recup",
                                reply_to:
                                    replyTo,
                                text:
                                    texte,
                                html
                            })
                    }
                );


            if (!reponse.ok) {

                console.error(
                    "Recovery email HTTP " +
                    reponse.status
                );


                return {
                    sent: false,
                    reason:
                        "provider_error"
                };

            }


            return {
                sent: true
            };

        }
        catch (erreur) {

            console.error(
                "Recovery email error :",
                erreur.message
            );


            return {
                sent: false,
                reason:
                    "provider_unavailable"
            };

        }

    }

}


export default new RecoveryEmailService();
