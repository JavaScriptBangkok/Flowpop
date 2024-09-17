const headers = new Headers()

headers.append("accept", "application/json, text/plain, */*");
headers.append("accept-language", "en-US,en;q=0.9,th;q=0.8,ja;q=0.7");
headers.append("authorization", "Bearer " + process.env.BEARER_TOKEN);
headers.append("cache-control", "no-cache");
headers.append("content-type", "application/json");
headers.append("origin", "https://advance.flowaccount.com");
headers.append("pragma", "no-cache");
headers.append("priority", "u=1, i");
headers.append("referer", "https://advance.flowaccount.com/");
headers.append("sec-ch-ua", "\"Not)A;Brand\";v=\"99\", \"Google Chrome\";v=\"127\", \"Chromium\";v=\"127\"");
headers.append("sec-ch-ua-mobile", "?0");
headers.append("sec-ch-ua-platform", "\"macOS\"");
headers.append("sec-fetch-dest", "empty");
headers.append("sec-fetch-mode", "cors");
headers.append("sec-fetch-site", "same-site");
headers.append("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36");

export { headers }