let http = require('http');
let https = require('https');
let express = require('express');
let cheerio = require('cheerio')
let app = new express();
let router = express.Router();
let baseUrl = 'https://www.imooc.com/'
app.use((req,res,next)=>{
    res.header('Content-Type','text/html;charset=utf-8' );
    next();
})
function removeEmpty(str){
    str = str.replace(/\ +/g, "");
    str = str.replace(/[ ]/g, "");;
    str = str.replace(/[\r\n]/g, "");
    return str
    console.log(str)
}
let page_list = []
function getList(html){
    let json = []
    let $ = cheerio.load(html)
    $('.course-card-container').each((index,el) => {
        let obj1 = {}
        skills = []
        let title = $(el).find('.course-card .course-card-name').text();
        let skil = $(el).find('.course-card .course-card-top .course-label label');
        skil.each((i,e) => {
            skills.push($(e).text())
        })
        let banner = $(el).find('.course-card .course-card-top .course-banner').attr('src');
        let grade = $(el).find('.course-card .course-card-info span').eq(0).text();
        let num = $(el).find('.course-card .course-card-info span').eq(1).text();
        let desc = $(el).find('.course-card .course-card-bottom .course-card-desc').text();
        let href = $(el).find('.course-card').attr('href');
        obj1 = {
            title: title,
            skills: skills,
            banner: banner,
            grade: grade,
            num: num,
            desc: desc,
            href: href
        }
        json.push(obj1)
    });
    return json
}
//获取课程列表
function getPage(req,res){
    return new Promise((resolve,reject)=>{
        let page = req.params.page
        https.get('https://www.imooc.com/course/list?c=fe&page='+page,(data)=>{
            
            let html = ''
            data.on('data',function(result){
                html += result
            })
            data.on('end',function(){
                let json = getList(html)
                page_list = json
                // res.json(json) //课程列表
                resolve(page_list)
            })
        }).on('err',(err)=>{
            reject(err)
            console.log('获取课程列表出错')
        })
    })
}
router.get('/imooc/:page',(req,res)=>{
    let details_list = []
    getPage(req,res).then(data => {
        data.forEach((val) => {
            details_list.push(getPageAsync(baseUrl + val.href))
        })
        Promise.all(details_list).then((data) => {
            res.json(data) //课程详情列表
        })
    })
})
//获取课程详情
function getDetails(html){
    let details = {}
    let $ = cheerio.load(html)
    details.title = $('.course-infos .hd h2').text()
    details.teacher = {}
    details.teacher.portrait = $('.course-infos .statics .js-usercard-dialog').attr('src')
    details.teacher.name = $('.course-infos .statics .tit a').text()
    details.teacher.job = $('.course-infos .statics .job').text()
    details.grade = $('.course-infos .statics .static-item').eq(0).children('.meta-value').text()
    details.duration = $('.course-infos .statics .static-item').eq(1).children('.meta-value').text()
    details.num = $('.course-infos .statics .static-item').eq(2).children('.js-learn-num').text()
    details.score = $('.course-infos .statics .static-item').eq(3).children('.meta-value').text()
    details.info = $('.course-info-main .course-description').text()
    details.chapters = []
    $('.course-info-main .chapter').each((index,el)=>{
        let chapter_title = $(el).find('h3').text()
        let chapter_desc = $(el).find('.chapter-description').text()
        let videos = []
        $('.course-info-main .chapter .video li').each((i,e)=>{
            let videoHref = $(e).children('.J-media-item').attr('href')
            let videoId = $(e).attr('data-media-id')
            let videoTitle = $(e).children('.imv2-play_circle type').text()
            videos.push(JSON.stringify({
                videoHref: videoHref,
                videoId: videoId,
                videoTitle: videoTitle
            }))
        })
        details.chapters.push({
            chapter_title: chapter_title,
            chapter_desc: chapter_desc,
            videos: videos
        })
    })
    // console.log(details)
    return details
}
function getPageAsync(url){
    return new Promise((resolve,reject)=>{
        // console.log('正在爬取'+url)
        https.get(url,(res)=>{
            let page =  ''
            res.on('data',(data)=>{
                page += data
            })
            res.on('end',()=>{
                let details = getDetails(page)
                resolve(details)
            })
        }).on('err',(err)=>{
            reject(err)
            console.log('获取课程详情出错')
        })
    })
}

app.use(router)
app.listen(9999,'0.0.0.0',()=>{
    console.log('server is runing port 9999')
})