var http = require("http");
var fs = require("fs");
var url = require("url");
var port = process.argv[2];

if (!port) {
  console.log("请指定端口号好不啦？\nnode server.js 8888 这样不会吗？");
  process.exit(1);
}

var server = http.createServer(function (request, response) {
  var parsedUrl = url.parse(request.url, true);
  var pathWithQuery = request.url;
  var queryString = "";
  if (pathWithQuery.indexOf("?") >= 0) {
    queryString = pathWithQuery.substring(pathWithQuery.indexOf("?"));
  }
  var path = parsedUrl.pathname;
  var query = parsedUrl.query;
  var method = request.method; //请求方法

  /******** 从这里开始看，上面不要看 ************/

  console.log("有个人发请求过来啦！路径（带查询参数）为：" + pathWithQuery);
  const session = JSON.parse(fs.readFileSync("./session.json"));

  if (path === "/home.html") {
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/html; charset=UTF-8");
    const cookie = request.headers["cookie"];
    let sessionId;
    try {
      sessionId = cookie.match(/session_id=[\d\.]+/)[0].split("=")[1];
    } catch {}
    //使用session文件，在服务器端完成读取信息的任务
    if (sessionId && session[sessionId]) {
      //上面的判断存在很重要,用户如果篡改cookie则不会继续
      const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      const userId = session[sessionId].userId;
      //!!!注意Id不要写成ID
      const user = userArray.find((user) => user.id === userId);
      if (user) {
        const content = homeHtml
          .replace("{{loginStatus}}", "已登录")
          .replace("{{userName}}", user.name);
        response.write(content);
        response.end();
      } else {
        const homeHtml = fs.readFileSync("./public/home.html").toString();
        const content = homeHtml
          .replace("{{loginStatus}}", "未登录")
          .replace("{{userName}}", "");
        response.write(content);
        response.end();
      }
    } else {
      response.end("出问题啦");
    }
  } else if (path === "/sign_in" && method === "POST") {
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
    const array = [];
    request.on("data", (chunk) => {
      array.push(chunk);
    });   //以Buffer二进制传入数据
    request.on("end", () => {
      // Buffer.concat将二进制转义并从数组中取出
      const string = Buffer.concat(array).toString();
      const obj = JSON.parse(string);
      const user = userArray.find(
        (user) => user.name === obj.name && user.password === obj.password
      );
      if (user) {
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html; charset=UTF-8");
        //通过session文件实现cookie的加密
        const random = Math.random();
        session[random] = { userId: user.id };
        fs.writeFileSync("./session.json", JSON.stringify(session));
        response.setHeader("Set-Cookie", `session_id=${random}; HttpOnly`);
        response.end();
      } else {
        response.statusCode = 400;
        response.setHeader("Content-Type", "text/json; charset=UTF-8");
        response.end(`{"errorCode": 4001}`);
      }
    });
  } else if (path === "/sign_up" && method === "POST") {
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/html; charset=UTF-8");
    const array = []; //用数组来盛放发送来的信息
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
    //模拟服务器获取表单提交来的信息
    request.on("data", (chunk) => {
      array.push(chunk);
    });
    request.on("end", () => {
      const string = Buffer.concat(array).toString(); //解析数据
      const obj = JSON.parse(string);
      const lastUserId = userArray[userArray.length - 1]
        ? userArray[userArray.length - 1].id
        : 0;
      const newUser = {
        id: lastUserId + 1,
        name: obj.name,
        password: obj.password,
      };
      userArray.push(newUser);
      fs.writeFileSync("./db/users.json", JSON.stringify(userArray));
    });
    response.end();
  } else {
    response.statusCode = 200;
    const filePath = path === "/" ? "/index.html" : path;
    const suffix = filePath.substring(filePath.lastIndexOf("."));
    const fileTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/Javascript",
      ".jpg": "image/jpeg",
      ".png": "image/png",
    };
    response.setHeader(
      "Content-Type",
      `${fileTypes[suffix] || "text/html"}; charset=utf-8`
    );
    let content;
    try {
      content = fs.readFileSync(`./public${filePath}`);
    } catch (error) {
      content = "您访问的文件不存在";
      response.status = 404;
    }
    response.write(content);
    response.end();
  }

  /******** 代码结束，下面不要看 ************/
});

server.listen(port);
console.log("监听 " + port + " 成功\n请打开网址 http://localhost:" + port);
