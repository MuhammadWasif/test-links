const request = require("request");
const fs = require("fs");
const chalk = require("chalk");
const http = require("http");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const EventEmitter = require("events");

class Job extends EventEmitter {}
const job = new Job();

job.on("received", () => {
  console.log("Response received");
  makeGetRequest(url);
});

// fucntion that make a GET request on every URL to check if it's not broken
async function makeGetRequest(link) {
  request(link, (er, data) => {
    if (er) console.log(er);
    let statusCode = data.statusCode;
    if (statusCode != 404) {
      console.log(chalk.green(`SUCCESS`), link);
    } else {
      console.log(chalk.red(`BROKEN`), link);
    }
  });
}

console.log("Process is running...");
/*
First, download the HTML of given web page by making a GET request.
Create an HTML file and host it locally. Make a request on localhost.
This step is necessary to get all links from DOM
*/
request("https://noman-gul.firebaseapp.com/", (req, res) => {
  const body = res.body;

  fs.writeFile("index.html", body, (er, data) => {
    console.log(chalk.green("Got all the links!"));
    let server = http.createServer((reqt, rest) => {
      fs.readFile("index.html", (er, data) => {
        rest.write(data);
        rest.end();
      });
    });

    server.listen(5655, () => {
      console.log(
        chalk.bold(`listening on ${chalk.underline("http://localhost:5655")}`)
      );
      request("http://localhost:5655", (er, response) => {
        const body = response.body;
        const dom = new JSDOM(body);
        let links = [];
        for (let link of dom.window.document.links) links.push(link.href);
        let uniqueLinks = [...new Set(links)];
        console.log(`${uniqueLinks.length} unique URLs found on website`);

        function loop(n) {
          if (n == uniqueLinks.length) {
            chalk.greenBright("All links have been checked!");
            process.exit();
          } else {
            request(uniqueLinks[n], (er, data) => {
              if (er) return er;
              let statusCode = data.statusCode;
              if (statusCode != 404) {
                console.log(chalk.green(`SUCCESS`), uniqueLinks[n]);
                n++;
                loop(n);
              } else {
                console.log(chalk.red(`BROKEN`), uniqueLinks[n]);
                n++;
                loop(n);
              }
            });
          }
        }
        loop(1);
      });
    });
  });
});
