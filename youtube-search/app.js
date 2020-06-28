const  Discord = require("discord.js");
const PREFIX = "!"
const config =require('./config.json');
const search = require('yt-search');
const fs = require('fs');
const ytdl = require("ytdl-core");
let request = require('request');
let cheerio = require('cheerio');
const url = 'http://happycastle.club/';
var bot = new Discord.Client();
var servers = {};

const streamOptions ={
    seek: 0,
    volume: 1
};
let checkOverlap = false;
let playList = [];
let coronaList = [];
let time;

function crawl(){
    request.get("http://ncov.mohw.go.kr/bdBoardList_Real.do?brdId=1&brdGubun=13&ncvContSeq=&contSeq=&board_id=&gubun=", function(err, res, html){
    const $ = cheerio.load(html,{
      decodeEntities:false
    });
    const $colArr = $('#content > div > div.data_table.tbl_scrl_mini2.mgt24 > table > tbody').children();
    const $timetable = $('#content > div > div.timetable > p > span').text();
    time = $timetable;

    $colArr.each(function(i, element){
      coronaList[i] = {
          지역: $(this).find('th').text(),
          확진환자증가: $(this).find('td.number:nth-child(2)').text(),  
          확진자: $(this).find('td.number:nth-child(3)').text(),
          격리해제: $(this).find('td.number:nth-child(5)').text(),
          사망: $(this).find('td.number:nth-child(6)').text()
        };
  });
  });
}

 function play(connection, message){
    var server = servers[message.guild.id];
                            
    server.dispatcher = connection.playStream(ytdl(server.queue[0], {filter: "audioonly",highWaterMark: 1<<25}), streamOptions);
        server.queue.shift();
                            
            server.dispatcher.on("end", function(){
                if(server.queue[0]){
                    setTimeout(()=>{ 
                        play(connection, message);
                        playList.shift();
                    }, 5000);
                                   
                }else {
                    connection.disconnect();
                }
            });
}

function emoji (name) {
    return bot.emojis.find(emoji => emoji.name === name).toString();
}

const calcCoin = (day1, day2)=>{
  var weekend = 0;
  var weekday = 0;
  var coin= 0;
  while (true) {
    var temp_date = day1;
    if (temp_date.getTime() > day2.getTime() + 86400000) {
      break;
    } else {
      var tmp = temp_date.getDay();
      if (tmp === 0) {
        weekend++;
      } else {
        weekday++;
      }
      temp_date.setDate(day1.getDate() + 1);
    }
  }
  console.log(weekend, weekday)
  coin = (weekday*300) + (weekend*600) ;
  return coin;
}

bot.on("ready", function(){ //봇이 준비되었을때
    console.log("ready"); //콘솔에 준비되었다고 띄우고
    bot.user.setActivity('김기정', {type: "PLAYING"}); //디스코드내의 "플레이중"을 '안녕하세요'로정한다.
})

bot.on("message", async function(message) { //메시지가 왔을때
    if (!message.guild) return;
    if (message.author.equals(bot.user)) return; //봇이면 무시

    if(message.author.bot) return; //봇이면 무시
    
    if (!message.content.startsWith(PREFIX)) return; //만약 메시지가 내가 정한 접두사로 시작하지 않는다면 무시
    var args = message.content.substring(PREFIX.length).split(" ")

    switch (args[0].toLowerCase()){
        // case "안녕": //만약 메시지가 {접두사}hello로 시작한다면
        //     message.channel.send("안녕하세요.") //안녕하세요라고 답변
        //     break;    //다음 스크립트가 실행 안되게 정지
        case "help":
        case "도움말":
            message.channel.send({
                embed: {
                    title: '꿀벌봇 명령어 목록',
                    description: 
                    `\:mask: 코로나

                     \:musical_note: 노래(ㄴ,노,찾기,재생),참가,나가,꺼져,그만

                     \:x: 스킵

                     \:scroll: 큐 (list,ㅋ,queue,q)
 
                     ${emoji("coin")}코인

                     ${emoji("muto")}무토
                    `
                }}).catch(err => console.log(err));
             break;

        case "코인":
            const now = new Date();
            const end = new Date('2020/09/02');
            const coin = calcCoin(now,end);

            message.channel.send('현재 가진 코인 갯수를 입력하세요.');
            filter = m => (m.author.id === message.author.id);
            let collectedNumber = await message.channel.awaitMessages(filter, {maxMatches: 1});
            let selectedNumber = collectedNumber.map(x=> x.content);
            console.log(typeof(coin));

            if(selectedNumber[0] == null){
                message.channel.send('숫자를 입력하세요.');
            }
            else{
                const now = new Date();
                message.channel.send({
                    embed: {
                        title: 
                        `${now.getMonth()+1}월 ${now.getDate()}일부터 ~ ${end.getMonth()+1}월 ${end.getDate()}일까지
                         모을 수 있는 코인 갯수`,
                        description: `${coin + parseInt(selectedNumber[0])}개 입니다.`,
                    }}).catch(err => console.log(err));
                    break;
            }
            
        case "무토":
            const image = {
                src: "https://t1.daumcdn.net/cfile/tistory/998B2A4F5B7A9EA115",
            }
            message.channel.send(image.src);
            break;

        case "코로나":
            await crawl();
            message.channel.send({
                embed: {
                    title: '코로나 정보',
                    description: 
                    `\:flag_white: 국가별(국가)

                     \:cityscape: 지역별(지역)
                    `,
                    color: 3
                }}).catch(err => console.log(err));

            function corona(country){
                request.get(`http://happycastle.club/status?country=${country}`, 
                function(err, res, body){``
                    if (err){
                       console.log(err);
                    }
                    
                    let result = JSON.parse(body)  
                    if (result.country == null){
                        message.channel.send("집계되지 않은 나라입니다.");
                    }
                    
                    else{
                    embed2 = new Discord.RichEmbed()
                    .setTitle(`${result.country}의 현재 코로나 상황`)
                    .setDescription(`사망자 : ${result.die}명
                                     확진자 : ${result.infected}명
                                     격리해제 : ${result.restore}명
                                     검사진행 : ${result.sus}명`)
                    .setColor('DARK_AQUA'); 
                    message.channel.send(embed2);
                    }                   
                    
                });
            }

            filter = m => (m.author.id === message.author.id);
            let collected = await message.channel.awaitMessages(filter, {maxMatches: 1});
            let selected = collected.map(x=> x.content);
            let SC;

            if(selected[0] == "국가"){
                message.channel.send("국가명을 입력해주세요.");
                filter = m => (m.author.id === message.author.id);
                let collectedCountry = await message.channel.awaitMessages(filter, {maxMatches: 1});
                let selectedCountry = collectedCountry.map(x=> x.content);
                if(selectedCountry[0] =="한국"){
                    selectedCountry[0] = "대한민국";
                    SC = encodeURI(selectedCountry[0]);
                    corona(SC);
                }
                else if(selectedCountry[0] =="일본"){
                    selectedCountry[0] = "일본[b]"
                    SC = encodeURI(selectedCountry[0]);
                    corona(SC);
                }
                else if(selectedCountry[0] == null){
                    message.channel.send("국가명을 입력해주세요.")
                    SC = encodeURI(selectedCountry[0]);
                    corona(SC);
                }
                else{
                    SC = encodeURI(selectedCountry[0]);
                    corona(SC);
                }
            }

            else if(selected[0]=="지역"){
                message.channel.send("지역명을 입력해주세요.(한국)");
                filter = m => (m.author.id === message.author.id);
                let collectedCity = await message.channel.awaitMessages(filter, {maxMatches: 1});
                let selectedCity = collectedCity.map(x=> x.content);
                let result = coronaList.filter(m => m.지역 == selectedCity[0]);
                result = result.shift();

                message.channel.send({
                    embed:{
                        title: `${result.지역}의 코로나 정보`,
                        description: `${time}기준

                                      확진자: ${result.확진자}(+${result.확진환자증가})

                                      격리해제: ${result.격리해제}

                                      사망: ${result.사망}`,
                        color: 2
                        
                    }
                })
            }
            
            break;
        case "참가":
            if (message.member.voiceChannel) {
                message.member.voiceChannel.join();
            } else {
                message.channel.send('\:poop: '+'채널에 참가 먼저해라');
              }
              break;

        case "꺼져":           
        case "나가":
            if (message.member.voiceChannel) {
                var server = servers[message.guild.id];
                message.member.voiceChannel.leave();
              } else {
                message.channel.send('채널에 참가 먼저해라');
              }
              break;

        case '재생':
            var server = servers[message.guild.id];
            if(message.guild.voiceConnection){
                if(server.dispatcher.paused){
                    server.dispatcher.resume();
                    console.log('노래 재생');
                }else(
                    message.member.voiceChannel.join()
                        .then((connection) => {
                            play(connection, message);
                        })
                );
            }
            break;    

        case '노래':
        case '찾기':
        case '노':
        case 'ㄴ':
            let find2;
            if (args.length > 2){
                find = args.shift();
                find2 = args.join(" ");
            }
            else{
                find2 = args[1];
            }

                await search({
                    query: find2,
                    pageStart:1,
                    pageEnd: 1,
                }, 
                async function(err, r){
                    if (r){


                        if(!args[1]){
                            message.channel.send('노래 제목을 검색하세요!');
                            return;
                        }

                        else if(!message.member.voiceChannel){
                            message.channel.send('채널에 참가 먼저하세요!');
                            return;
                        }

                        else if(!servers[message.guild.id]) servers[message.guild.id] = { queue: [] }
                        var server = servers[message.guild.id];  

                        let ytResults = r.videos;
                        ytResults.splice(10);
                        let i = 0;
                        let titles = ytResults.map(result => {
                            i++;
                            return i + ") " + result.title + '  \:arrow_forward:  ' + result.timestamp;
                        });

                        //노래검색 완료전에 다시 노래 검색하면 리턴.
                        if(checkOverlap){
                            message.channel.send("먼저 노래를 고르세요!");
                            return;
                        }

                        message.channel.send({
                            embed: {
                                title: '번호로 노래를 고르세요',
                                description: titles.join("\n"),
                            }}).catch(err => console.log(err));
                        checkOverlap = true;

                        filter = m =>(m.author.id === message.author.id) && 
                            m.content >= 1 && 
                            m.content <= ytResults.length || 
                            m.content === '취소' ||
                            m.content === 'cancel';
                        let collected = await message.channel.awaitMessages(filter, {maxMatches: 1});
                        console.log(collected);
                        let selected = ytResults[collected.first().content - 1];
                        console.log(selected);
                        server.queue.push(selected.url);
                       
                        playList.push( 
                            {
                                user: message.author.username,
                                songTitle: selected.title
                            }
                        );

                        embed = new Discord.RichEmbed()
                        .setTitle(`${selected.title}`)
                        .setURL(`${selected.url}`)
                        .setDescription(`${selected.description}`)
                        .setThumbnail(`${selected.thumbnail}`); 

                        message.channel.send(embed);
                        
                        checkOverlap = false;
                        if(!message.guild.voiceConnection) message.member.voiceChannel.join()
                        .then((connection) => {
                            play(connection, message);
                        });
                        if(message.guild.voiceConnection && !playList[1])  message.member.voiceChannel.join()
                        .then((connection) => {
                            play(connection, message);
                        });

                    }
                });
        
        break;
            
        
        case '스킵':
            var server = servers[message.guild.id];
            if(server.dispatcher) server.dispatcher.end();
        break;

        case '그만':
            var server = servers[message.guild.id];
            if(message.guild.voiceConnection){
                for(var i = server.queue.length -1; i >=0; i--){
                    server.queue.splice(i, 1);
                }
                server.dispatcher.pause();
                console.log('노래 정지');
            }

            // if(message.guild.connection) message.guild.voiceConnection.disconnect();   
        break;     

        case 'list':
        case 'queue':
        case 'q':
        case '큐':
        case 'ㅋ':
            let j = 0;
            let nowPlaying = playList.shift();
            let PL = playList.map(result => {
                j++;
                return j + ") " + result.songTitle + "  신청자: " + result.user;
            });
            
            message.channel.send({
                embed: {
                    title: '플레이 리스트 목록',
                    description: 
                    `\:musical_note: 현재 재생중인 노래 \:musical_note:
                    ${nowPlaying.songTitle}   신청자: ${nowPlaying.user}
                    
                    ${PL.join("\n")}`
                }}).catch(err => console.log(err));
        break;
    }
});

bot.login(config.TOKEN);
