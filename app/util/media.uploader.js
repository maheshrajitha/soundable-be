const http = require('http');
const url = require('url');
const queryString = require('querystring');
const env = process.env;
module.exports = {
    mp3Upload: (data , trackId , thumbnail , callback) => {
        let mediaUrl = url.parse(env.MEDIA_URL);
        let rBody = queryString.stringify({
            track: Buffer.from(data).toString("base64"),
            trackId: trackId,
            thumbnail: Buffer.from(thumbnail).toString("base64")
        })

        let trackSavingRequest = http.request({
            host: mediaUrl.host,
            port: mediaUrl.port || 80,
            path: mediaUrl.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization':'vjvjggyusrwrwsreshui'
            },
        }, response => {
            let body = "";
            response.setEncoding('utf8');
            response.on('data', (chunk) => {
                body += chunk
            });
            response.on('end', () => {
                callback(false, JSON.parse(body));
            });
        }).on('error', err => {
            callback(true, err);
        });
        trackSavingRequest.write(rBody);
        trackSavingRequest.end();
    },
    deleteMp3: (id, callback) => {
        let mediaUrl = url.parse(`${env.MEDIA_URL}delete.php/`);
        let requestBody = queryString.stringify({
            id: id
        });
        let deleteRequest = http.request({
            port: mediaUrl.port || 80,
            host: mediaUrl.host,
            path: mediaUrl.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'vjvjggyusrwrwsreshui'
            },
        }, response => {
            response.setEncoding('utf8');
            let body = "";
            response.on('data', data => {
                body += data;
            });
            response.on('end', () => {
                callback(false, JSON.parse(body));
            });
        }).on('error', error => {
            callback(true, error);
        });
        deleteRequest.write(requestBody);
        deleteRequest.end();
    }
}