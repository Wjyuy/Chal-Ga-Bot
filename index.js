// 1. 주요 클래스 가져오기
const { randomBytes } = require('crypto');
const { Client, Events, GatewayIntentBits, AttachmentBuilder} = require('discord.js');

//토큰은 dotenv 사용
require('dotenv').config();
const token = process.env.DISCORD_BOT_TOKEN;

//핸들러추가해봤음(잘된다)
const { CommandHandler } = require("djs-commander");
const path = require("path");

// 2. 클라이언트 객체 생성 (Guilds관련, 메시지관련 인텐트 추가)
const client = new Client({ intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
]});

//핸들러 생성(commands 까지 잘된다)
new CommandHandler({
    client,
    commandsPath: path.join(__dirname, "commands"),
    eventsPath: path.join(__dirname, "events"),
  });

// 3. 봇이 준비됐을때 한번만(once) 표시할 메시지
// client.once(Events.ClientReady, readyClient => {
// console.log(`Ready! Logged in as ${readyClient.user.tag}`);
// });

// 4. 누군가 ping을 작성하면 pong으로 답장한다.
/*
client.on('messageCreate', (message) => {
    if(message.content == '승민아'){
        message.reply('マグネットペットほしい-');
    }
    if(message.content == '엄'){
        message.reply('준');
    }
    if(message.content == '준'){
        message.reply('식');
    }
    if(message.content == '주군'){
        message.reply('태양의주군');
    }
    if (message.content.includes("신라")) {
        message.reply('텐세...!!!');
    }
    if (message.content.includes("카미나리노")) {
        message.reply('헤키레키잇센');
    }
    if (message.content.includes("코이츠")) {
        message.reply('wwwwwww');
    }
    if (message.content.includes("고무고무노")) {
        message.reply('피스토루~~~~!!!!');
    }
    if (message.content.includes("매화검존")) {
        if (message.author.bot) {
            return;
        }
        message.reply('"화산은 화산의 길을 간다."');
    }
    if(message.content == '이기어검'){
        message.reply('응애');
    }
    if(message.content == '그긴거' || message.content == '그 긴거'){
        if (message.author.bot) {
            return;
        }
        message.reply('조금 더 무에 정진했다면 하나라도 살릴 수 있지 않았을까?');
        message.reply('스승과 사형의 말을 귓등으로 듣고, 문파 밖으로 나도는 멍청한 삶을 살지 않았더라면.');
        message.reply('매화검존(梅花劍尊)이라는 아무짝에도 쓸모없는 허명이 아니라, 진정으로 화산의 검을 얻었더라면 결과는 조금 달랐을까?');
        message.reply('부질없다.');
        message.reply('또한 부질없다.');
        message.reply('남는 것은 그저 후회뿐.');
        message.reply('그리고 사문에 대한 걱정뿐이었다.');
    }
    if(message.content == '무협 경지' || message.content == '무협경지'){
        message.reply('노화순청등봉조극만류귀종반로환동반박귀진반선지경삼화취정오기조원우화등선천화난추출신입화환골탈태무극금강불괴만독불침도검불침한서불침심즉살');
    }
    if (message.content.includes("일어나")) {
        message.reply('크오오오오오....');
    }
    if (message.content.includes("입신")) {
        message.reply('무공의 영역을 초월하고 수명 또한 초월하는 등선 직전의 경지라 할 수 있다....');
    }
    if (message.content.includes("카이저")) {
        message.reply('윌 오브 소드, 소드 스트라이크 쓰는 ㅄ');
    }
    if (message.content.includes("아델")) {
        message.reply('팡이요셔?');
    }
    if (message.content.includes("데미안")) {
        message.reply('페이즈 패턴2페이즈에서 낙인사를 하면 할수록 공중을 날아다니는 검이 하나씩 생긴다.');
    }
    if (message.content.includes("세렌")) {
        message.reply('2페이즈의 광휘의 검, 타오르는검');
    }
    if (message.content.includes("비행")) {
        message.reply('허공답보');
    }
    if (message.content.includes("치킨")) {
        message.reply('BBQ');
    }
    if (message.content.includes("주원아")) {
        if (message.author.bot) {
            return;
        }
        message.reply('"내가 바로 십만대산의 주인이다."');
    }
    if (message.content.includes("정교주")) {
        message.reply('"천마신교 천천세 !!!!!! "');
    }
    if (message.content.includes("밥알")) {
        if (message.author.bot) {
            return;
        }
        message.reply('이 초밥에 들어가는 밥알 갯수말이다.');
        message.reply('셰프:"일본의 최고의 초밥장인이 350개씩 넣고있습니다..."');
        message.reply('이렇게 좋은날에는 250개만 해라 배안부르고로고로고로');
    }
    if (message.content.includes("주연아")) {
        message.reply('승민:"당신이 몰락한 화산을 버리지 않았듯이,"');
        message.reply('"저도 제 사문을 버리지 않습니다."');
        message.reply('"다 타서 재만 남았는데도?"');
        message.reply('주연:"그럼... "');
        message.reply('"제가 다시 불씨가 되어 불을 일으키면 되겠죠."');
    }
    if (message.content.includes("청명")) {
        if (message.author.bot) {
            return;
        }
        message.reply('사형.');
        message.reply('장문사형.');
        message.reply('저는....');
        message.reply('아직도 화산에 갚아야할 빚이 너무 많습니다.');
        message.reply('사형....');
    }
    if (message.content.includes("미안하오")) {
        if (message.author.bot) {
            return;
        }
        message.reply('다시는 꺼내지 않으려 했건만...');
        message.reply('울어라,');
        message.reply('"지옥 참마도"');
    }
    if (message.content.includes("네코")) {
        if (message.author.bot) {
            return;
        }
        message.reply('迷子の迷子のこねこちゃん');
        message.reply('あなたのお家はどこですか~');
        message.reply('お家をきいてもわからない');
        message.reply('名前をきいてもわからない');
        message.reply('ニャン ニャン ニャン ニャーン');
        message.reply('迷子の迷子のこねこちゃん');
    }
    if (message.content.includes("눕프핵") || message.content.includes("눕프로해커")) {
        if (message.author.bot) {
            return;
        }
        message.reply('안녕하세요유듀부시청자여러분오늘해볼건덴츠는~~~');
        message.reply('눕쁘로~~~해까~');
    }
    if (message.content.includes("유바")) {
        if (message.author.bot) {
            return;
        }
        message.reply('깜찍이 깜찍이 깜찍이~');
    }
    if (message.content.includes("천민")) {
        if (message.author.bot) {
            return;
        }
        message.reply('반갑네 천민들');
        message.reply('비즈니스 킴이네');
    }
})
 */
// 5. 시크릿키(토큰)을 통해 봇 로그인 실행2
client.login(token);