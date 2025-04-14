import express from "express"
import cors from "cors"
import fileUpload from "express-fileupload"
import mariadb from "mariadb";
import fs from "fs/promises"
import { DocumentsModel } from "./models/DocumentsModel.js";
import jwt from "jsonwebtoken";

const secret = "test";

const app = express()
const port = 3400;

app.use(cors());
app.use(express.static("public"));
app.use(fileUpload());
app.use(express.json());

app.get("/login",async(req,res)=>{
    
})

app.post("/create_account",async (req,res)=>{
    const payload = {identifiant : req.body.identifiant, password : req.body.password};
    const newToken = jwt.sign(payload,secret,{
        expiresIn:"30 days"
    });
    
    console.log("identifiant : ",req.body.identifiant);
    console.log("password : ",req.body.password);
    const connection = await DocumentsModel.connection();
    const enregistrement = await DocumentsModel.createAccount(req.body.identifiant,req.body.password);
    res.json({jwt:newToken});
})

app.post("/upload_documents",async (req,res)=>{
    const body = req.body;
    const url = req.files.url;
    console.log(body.name);
    console.log(body.owner);
    console.log(url);

    if (url==undefined) {
        req.status(400).json({msg:"Pas de document envoyé"});
        return;
    }

    const extensionFile = url.name.split(".")[1];
    const fileName = url.name.split(".")[0];
    const completeFileName = `${fileName}_${Date.now()}.${extensionFile}`;
    
    url.mv(`./public/${completeFileName}`);

    const connection = await DocumentsModel.connection();
    const result = await DocumentsModel.createDocuments(body.name,body.owner,completeFileName);

    res.json({url:`http://localhost:3400/${completeFileName}`});
})
// app.use((req,res)=>res.status(400).json({msg:"La route n'existe pas"}));

app.get("/get_document/:filename",async (req,res)=>{
    // je m'attend a recevoir juste l'url du file pour pouvoir le select par son nom dans ma bdd
    // const filename = req.body.filename;
    console.log("okdqkdsq");
    const filename = req.params.filename;

    const buf = await fs.readFile(`./public/${filename}`)

    // const connection = await DocumentsModel.connection();
    // const result = await DocumentsModel.getDocument(filename);

    res.send(buf);
    
})

app.get("/get_all_documents/:owner", async (req,res)=>{
    // j'attend un objet avec attribut : name(owner)
    // const body = req.body;
    // console.log(body);
    const name_owner = req.params.owner;
    console.log(name_owner);

    const connection = await DocumentsModel.connection();
    const result = await DocumentsModel.getAllDocuments(name_owner);

    res.json(result);
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