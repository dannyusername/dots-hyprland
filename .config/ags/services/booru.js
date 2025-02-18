import Service from 'resource:///com/github/Aylur/ags/service.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

const APISERVICES = {
    'szurubooru': {
        name: 'Szurubooru',
        endpoint: 'http://localhost:8080/api/posts'
    },
    'yandere': {
        name: 'yande.re',
        endpoint: 'https://yande.re/post.json',
    },
    'konachan': {
        name: 'Konachan',
        endpoint: 'https://konachan.net/post.json',
    },

}

const getWorkingImageSauce = (url) => {
    if (url.includes('pximg.net')) {
        return `https://www.pixiv.net/en/artworks/${url.substring(url.lastIndexOf('/') + 1).replace(/_p\d+\.(png|jpg|jpeg|gif)$/, '')}`;
    }
    return url;
}

function paramStringFromObj(params) {
    return Object.entries(params)
        .map(([key, value]) => {
            if (Array.isArray(value)) { // If it's an array, repeat
                if (value.length == 0) return '';
                let thisKey = `${encodeURIComponent(key)}=${encodeURIComponent(value[0])}`
                for (let i = 1; i < value.length; i++) {
                    thisKey += `&${encodeURIComponent(key)}=${encodeURIComponent(value[i])}`;
                }
                return thisKey;
            }
            return `${key}=${value}`;
        })
        .join('&');
}

class BooruService extends Service {
    _baseUrl = 'http://localhost:8080/api/posts';
    _mode = 'szurubooru';
    _nsfw = userOptions.sidebar.image.allowNsfw;
    _responses = [];
    _queries = [];

    static {
        Service.register(this, {
            'initialized': [],
            'clear': [],
            'newResponse': ['int'],
            'updateResponse': ['int'],
        }, {
            'nsfw': ['boolean'],
        });
    }

    constructor() {
        super();
        this.emit('initialized');
    }

    clear() {
        this._responses = [];
        this._queries = [];
        this.emit('clear');
    }

    get nsfw() { return this._nsfw }
    set nsfw(value) { this._nsfw = value; this.notify('nsfw'); }

    get mode() { return this._mode }
    set mode(value) {
        this._mode = value;
        this._baseUrl = APISERVICES[this._mode].endpoint;
    }
    get providerName() {
        return APISERVICES[this._mode].name;
    }
    get queries() { return this._queries }
    get responses() { return this._responses }

    async fetch(msg) {
        // Init
        const userArgs = `${msg}${(!this._nsfw || msg.includes(':safe')) ? ' rating:safe' : ''}`.split(/\s+/);
        console.log(userArgs)

        let taglist = [];
        let page = 1;
        let limit = 10;
        // Construct body/headers
        for (let i = 0; i < userArgs.length; i++) {
            const thisArg = userArgs[i].trim();
            if (thisArg.length == 0 || thisArg == '.' || thisArg.includes('*')) continue;
            else if (!isNaN(thisArg)) page = parseInt(thisArg);
            else taglist.push(thisArg);
        }
        const newMessageId = this._queries.length;
        this._queries.push({
            providerName: APISERVICES[this._mode].name,
            taglist: taglist.length == 0 ? ['*', `${page}`] : [...taglist, `${page}`],
            realTagList: taglist,
            page: page,
        });
        this.emit('newResponse', newMessageId);

        const offset = (page - 1) * limit;

        const params = {
            'offset': offset,
            'limit': limit,
            'query': taglist.join('+')
        };
        const paramString = paramStringFromObj(params);
        
        const API_KEY = process.env.SZURU_API_KEY;
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Token ${API_KEY}`,
                'Accept': 'application/json, image/png, image/jpeg, video/mp4, image/gif',
                'Content-Type': 'application/json, image/png, image/jpeg, video/mp4, image/gif'
            }
        };

        let status = 0;

        try {
            // Fetch from the Szurubooru API
            const response = await Utils.fetch(`${APISERVICES[this._mode].endpoint}?${paramString}`, options);
            const dataString = await response.text();
            const parsedData = JSON.parse(dataString);

            // Map the response data to your format
            this._responses[newMessageId] = parsedData.results.map(post => ({
                aspect_ratio: post.canvasWidth / post.canvasHeight,
                id: post.id,
                tags: post.tags.map(tag => tag.names.join(" ")).join(" "), // Handling multiple tag names
                rating: post.safety,
                is_nsfw: post.safety !== 'safe',
                md5: post.checksumMD5,
                preview_url: `http://localhost:8080/${post.thumbnailUrl}`,
                preview_width: 200, // Adjust preview width as needed
                preview_height: 200, // Adjust preview height as needed
                sample_url: `http://localhost:8080/${post.contentUrl}`,
                sample_width: post.canvasWidth,
                sample_height: post.canvasHeight,
                file_url: `http://localhost:8080/${post.contentUrl}`,
                file_ext: post.mimeType.split("/")[1], // Extract file extension from mimeType
                file_width: post.canvasWidth,
                file_height: post.canvasHeight,
                source: post.source || "Unknown",
                score: post.score,
                favoriteCount: post.favoriteCount,
                ownFavorite: post.ownFavorite,
                commentCount: post.commentCount,
                pools: post.pools,
                comments: post.comments,
            }));

            this.emit('updateResponse', newMessageId);
        } catch (error) {
            console.error('Failed to fetch Szurubooru posts:', error);
        }
    }
}

export default new BooruService();
