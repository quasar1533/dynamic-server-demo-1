const fs = require("fs");

//读数据库
const string = fs.readFileSync("./db/users.json").toString();
const userArray = JSON.parse(string);
console.log(typeof userArray);

//写数据库
let user3 = { name: "Marry", age: 21, password: "ccc" };
userArray.push(user3);
const userString = JSON.stringify(userArray);
fs.writeFileSync("./db/users.json", userString);

