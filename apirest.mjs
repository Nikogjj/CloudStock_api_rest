import express from "express"
import cors from "cors"
import fileUpload from "express-fileupload"
import fs from "fs/promises"
import { DocumentsModel } from "./models/DocumentsModel.js";
import jwt from "jsonwebtoken";
import { decode } from "punycode";

const secret = "test";

const app = express()
const port = 3400;

app.use(cors());
app.use(express.static("public"));
app.use(fileUpload());
app.use(express.json());

app.post("/login",async(req,res)=>{
    const connection = await DocumentsModel.connection();
    const login = await DocumentsModel.login(req.body.identifiant,req.body.password); 
    console.log("login dans le main:",login);
    console.log(login[0].id)
    const payload = {id : login[0].id, identifiant : req.body.identifiant, password : req.body.password};
    const newToken = jwt.sign(payload,secret,{
        expiresIn:"30 days"
    });
    if (login.length==1)
    {
        console.log("le compte existe");
        res.status(200).json({jwt:newToken})
    }
    else{
        res.status(400).json({msg:"mauvais mot de passe ou identifiant",data:null})
    }
})
app.post("/create_account",async (req,res)=>{
    console.log("identifiant : ",req.body.identifiant);
    console.log("password : ",req.body.password);
    console.log("password : ",req.body.checkPassword);
    if (req.body.checkPassword != req.body.password) {
        console.log("passwords doesn't match")
        res.status(400).json({error : "Passwords doesn't match",msg : "Les mots de passe ne sont pas identiques"});
        return;
    }
    const connection = await DocumentsModel.connection();
    const check = await DocumentsModel.checkValidNewUserName(req.body.identifiant);
    console.log("CHECK : ",check);
    if (check.length>0) {
        console.log("IL Y A DEJA DES USERS AVEC CE NAME")
        res.status(400).json({error : "Username already used",msg : "L'identifiant choisi est déjà attribué"});
    }
    else{
        const enregistrement = await DocumentsModel.createAccount(req.body.identifiant,req.body.password);
        res.status(200).json({error : "none", msg : "Compte créé avec succès. Vous pouvez maintenant vous connecter"});
    }
})
app.post("/upload_documents",async (req,res)=>{

    const authHeader = req.headers.authorization;
    const tokenToVerify = authHeader.split(" ")[1];

    jwt.verify(tokenToVerify,secret,async (err,decodedToken)=>{
        if (err) {
            console.log(err.message)
            res.status(400).json({error : "Unauthorized acces, wring token", msg : "Accès non autorisé"});
            return;
        }
        else{
            console.log(decodedToken.identifiant)
            const file = req.files.file;
            if (file==undefined) {
                req.status(400).json({msg:"Pas de document envoyé"});
                return;
            }
            const extensionFile = file.name.split(".")[1];
            const fileName = file.name.split(".")[0];
            const completeFileName = `${fileName}_${Date.now()}.${extensionFile}`;
            
            // if (fs.readdir(`./public/${decodedToken.id}`)) {
                
            // }

            await fs.mkdir(`./public/${decodedToken.id}`)
            .catch(error=>{
                if (error.errno != -17) {
                    console.log(error)
                }
            })
            file.mv(`./public/${decodedToken.id}/${completeFileName}`);
        
            const connection = await DocumentsModel.connection();
            const result = await DocumentsModel.createDocuments(decodedToken.identifiant,decodedToken.id,completeFileName);
            console.log(result)
            res.json({ok : "ok"})
            return;
        }
    })

    
})
app.get("/get_document/:filename/:token",async (req,res)=>{

    const authHeader = req.params.token;
    const tokenToVerify = authHeader.split(" ")[1];
    console.log(tokenToVerify);

    jwt.verify(tokenToVerify,secret,async (err,decodedToken)=>{
        if (err) {
            console.log(err.message)
            res.status(400).json({error : "Unauthorized acces, wring token", msg : "Accès non autorisé"});
            return;
        }
        else{
            const filename = req.params.filename;
            const owner_id = decodedToken.id
            const buf = await fs.readFile(`./public/${owner_id}/${filename}`)
            res.status(200).send(buf);
            return;
        }
    })

    // const connection = await DocumentsModel.connection();
    // const result = await DocumentsModel.getDocument(filename);

    
})
app.get("/get_all_documents", (req,res)=>{
    const authHeader = req.headers.authorization;
    const tokenToVerify = authHeader.split(" ")[1];

    jwt.verify(tokenToVerify,secret,async (err,decodedToken)=>{
        if (err) {
            console.log(err.message)
            res.status(400).json({error : "Unauthorized acces, wring token", msg : "Accès non autorisé"});
            return;
        }
        else{
            console.log(decodedToken);
            const connection = await DocumentsModel.connection();
            const result = await DocumentsModel.getAllDocuments(decodedToken.id);
            console.log("result : ",result);
            res.status(200).json({id : decodedToken.id , identifiant : decodedToken.identifiant, documents : result});
            return;
        }
    })

})
app.delete("/delete_document", async (req,res)=>{
    // j'attend un objet avec juste l'url du fichier a supprimer
    const filename = req.body.filename;
    const connection = await DocumentsModel.connection();
    const result = await DocumentsModel.deleteSingleDocument(filename);
    
    fs.rm(`./public/${filename}`);

    console.log("result dans mon main : ",result);
    res.json({
        affectedRow:result.affectedRow,
        insertId : Number(result.insertId),
        warning : result.warning
    });
})
app.delete("/delete_all_documents",async(req,res)=>{
    // j'attend juste le nom de l'owner pour pouvoir tout delete dans la bdd
    console.log("LIGNE 90 : ",req.body.owner); 
    const connection = await DocumentsModel.connection();
    const tab_documents = await DocumentsModel.getAllDocuments(req.body.owner);

    tab_documents.forEach((document) => {
        console.log(`./public/${document.url}`);
        fs.rm(`./public/${document.url}`);
    });
    const result = await DocumentsModel.deleteAllDocuments(req.body.owner);
    console.log(result);
    res.json({
        affectedRow:result.affectedRow,
        insertId : Number(result.insertId),
        warning : result.warning
    });

})

app.listen(port,()=>{
    console.log(`server listen on port ${port}`)
})