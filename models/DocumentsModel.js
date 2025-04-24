import mariadb from "mariadb";

export class DocumentsModel{
    static connection_etat =null;

    static async connection(){
        if ((DocumentsModel.connection_etat!=null)==true) {
            console.log("ouai ouai")
            const test = await DocumentsModel.deconnection();
        }
        return mariadb.createConnection({
            host : "0.0.0.0",
            port : 3306,
            user : "root",
            password : "root",
            database : "CloudStock"
        })
        .then(connection=>{
            DocumentsModel.connection_etat=connection;
            return DocumentsModel.connection_etat;
        })
    }

    static async login(identifiant,password){
        const login = await DocumentsModel.connection_etat.query(`SELECT * FROM Users WHERE identifiant="${identifiant}" AND password="${password}"`);
        return login;
    }


    static async checkValidNewUserName(identifiant){
        const check = await DocumentsModel.connection_etat.query(`SELECT * FROM Users WHERE identifiant="${identifiant}";`)
        return check;
    }

    static async createAccount(identifiant, password){
        const createAccount = await DocumentsModel.connection_etat.query(`INSERT INTO Users (identifiant,password) VALUES("${identifiant}","${password}")`);
        return createAccount;
    }

    static async createDocuments(name,id,completeFileName){
        // console.log(name,owner,completeFileName);
        const results = await DocumentsModel.connection_etat.query(`INSERT INTO Documents (owner_id,name,owner_name) VALUES ("${id}","${completeFileName}","${name}");`)
        .catch(error=>console.error("Error de createDocuments : ",error.sqlMessage));

        return results;
    }

    static async getDocument(finalename){
        const result = await DocumentsModel.connection_etat.query(`SELECT * FROM Documents WHERE url="${finalename}"`)
        .catch(error=>console.error(error));

        return result;
    }

    static async getAllDocuments(owner){
        const result = await DocumentsModel.connection_etat.query(`SELECT * FROM Documents WHERE owner_id="${owner}";`)
        .catch(error => console.error(error));
        return result;
    }

    static async deleteSingleDocument(fileName){
        const result = await DocumentsModel.connection_etat.query(`DELETE FROM Documents WHERE url ="${fileName}";`)
        .catch(error=>{
            console.error(error);
        });
        console.log("result : ",result);
        return result;
    }

    static async deleteAllDocuments(owner_name){
        const result = await DocumentsModel.connection_etat.query(`DELETE FROM Documents WHERE owner="${owner_name}";`)
        .catch(error=>console.error(error));
        return result;
    }

    static async modifyDocument(filename){
        
    }

    static deconnection(){
        return DocumentsModel.connection_etat.end()
        .then(()=>{
            DocumentsModel.connection_etat=null;
            return 1;
        });
    }
}