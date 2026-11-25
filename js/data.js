// Contenido pedagógico. Katakana se deriva del hiragana (codepoint +0x60).
const mk=(s,kind='kana')=>s.split(',').map(x=>{const[j,r]=x.trim().split(' ');return{id:j,jp:j,r:r.split('|'),kind}});
const K=c=>[...c].map(x=>String.fromCharCode(x.charCodeAt(0)+96)).join('');
const kat=a=>a.map(i=>({...i,id:K(i.id),jp:K(i.id)}));
const wd=s=>s.trim().split('\n').map(l=>{const[syl,r,es,note='']=l.split('|');const s2=syl.split('.');return{id:'w:'+s2.join(''),jp:s2.join(''),syl:s2,r:[r],es,note,kind:'word'}});

const BASE=mk('あ a,い i,う u,え e,お o,か ka,き ki,く ku,け ke,こ ko,さ sa,し shi|si,す su,せ se,そ so,た ta,ち chi|ti,つ tsu|tu,て te,と to,な na,に ni,ぬ nu,ね ne,の no,は ha,ひ hi,ふ fu|hu,へ he,ほ ho,ま ma,み mi,む mu,め me,も mo,や ya,ゆ yu,よ yo,ら ra,り ri,る ru,れ re,ろ ro,わ wa,を wo|o,ん n|nn');
const DAK=mk('が ga,ぎ gi,ぐ gu,げ ge,ご go,ざ za,じ ji|zi,ず zu,ぜ ze,ぞ zo,だ da,ぢ ji|di|zi,づ zu|du,で de,ど do,ば ba,び bi,ぶ bu,べ be,ぼ bo,ぱ pa,ぴ pi,ぷ pu,ぺ pe,ぽ po');
const COM=mk('きゃ kya,きゅ kyu,きょ kyo,しゃ sha|sya,しゅ shu|syu,しょ sho|syo,ちゃ cha|tya,ちゅ chu|tyu,ちょ cho|tyo,にゃ nya,にゅ nyu,にょ nyo,ひゃ hya,ひゅ hyu,ひょ hyo,みゃ mya,みゅ myu,みょ myo,りゃ rya,りゅ ryu,りょ ryo,ぎゃ gya,ぎゅ gyu,ぎょ gyo,じゃ ja|jya|zya,じゅ ju|jyu|zyu,じょ jo|jyo|zyo,びゃ bya,びゅ byu,びょ byo,ぴゃ pya,ぴゅ pyu,ぴょ pyo');

const W1=wd(`あ.か|aka|rojo
あ.お|ao|azul
し.ろ|shiro|blanco
く.ろ|kuro|negro
そ.ら|sora|cielo
く.ち|kuchi|boca
み.み|mimi|oreja
い.え|ie|casa
い.す|isu|silla
か.さ|kasa|paraguas
た.こ|tako|pulpo
と.り|tori|pájaro
う.し|ushi|vaca
う.ま|uma|caballo
さ.る|saru|mono
く.ま|kuma|oso
か.め|kame|tortuga
ふ.ね|fune|barco
ひ.と|hito|persona
ち.ち|chichi|papá (mi padre)
は.は|haha|mamá (mi madre)
ほ.し|hoshi|estrella
つ.き|tsuki|luna
ゆ.き|yuki|nieve
な.つ|natsu|verano
あ.き|aki|otoño
ふ.ゆ|fuyu|invierno
は.る|haru|primavera
み.せ|mise|tienda
な.ま.え|namae|nombre
に.ほ.ん|nihon|Japón
く.つ|kutsu|zapatos
う.た|uta|canción
よ.る|yoru|noche
ね.こ|neko|gato
い.ぬ|inu|perro
さ.か.な|sakana|pez
ほ.ん|hon|libro
や.ま|yama|montaña
は.な|hana|flor
あ.め|ame|lluvia
さ.く.ら|sakura|cerezo
う.み|umi|mar`);
const W2=wd(`み.ず|mizu|agua
か.ぜ|kaze|viento
ご.み|gomi|basura
だ.い.が.く|daigaku|universidad
で.ぐ.ち|deguchi|salida
い.り.ぐ.ち|iriguchi|entrada
ぶ.た|buta|cerdo
ば.ら|bara|rosa
か.ぎ|kagi|llave
す.ず.め|suzume|gorrión
ぞ.う|zou|elefante
か.ぞ.く|kazoku|familia
く.だ.も.の|kudamono|fruta
ど.う.ぶ.つ|doubutsu|animal
あ.さ.ご.は.ん|asagohan|desayuno
ひ.る.ご.は.ん|hirugohan|almuerzo
ば.ん.ご.は.ん|bangohan|cena
だ.れ|dare|¿quién?
ど.こ|doko|¿dónde?
ど.れ|dore|¿cuál?
ぱ.ぱ|papa|papá
え.ん.ぴ.つ|enpitsu|lápiz
て.ん.ぷ.ら|tenpura|tempura
さ.ん.ぽ|sanpo|paseo
ぼ.う.し|boushi|sombrero
ひ.こ.う.き|hikouki|avión
だ.い.ど.こ.ろ|daidokoro|cocina
と.も.だ.ち|tomodachi|amigo
で.ん.わ|denwa|teléfono
ぶ.ど.う|budou|uva
か.ば.ん|kaban|mochila
ご.は.ん|gohan|arroz / comida
ぎ.ん.こ.う|ginkou|banco`);
const W3=wd(`ちょ.っ.と|chotto|un poco|っ duplica la t: chot-to.
しゅ.み|shumi|pasatiempo|しゅ = shu, una sola sílaba.
しゅ.く.だ.い|shukudai|tarea
じゅ.う|juu|diez|う alarga la u.
ひゃ.く|hyaku|cien
びょ.う.き|byouki|enfermedad
りょ.こ.う|ryokou|viaje
りょ.う.り|ryouri|cocina / plato
お.ちゃ|ocha|té
ぎゅ.う.にゅ.う|gyuunyuu|leche
じ.て.ん.しゃ|jitensha|bicicleta
ず.っ.と|zutto|siempre / mucho tiempo|っ duplica la t.
も.っ.と|motto|más
い.っ.ぱ.い|ippai|lleno / mucho|っ antes de p: pp.
が.っ.き|gakki|instrumento musical|っ antes de k: kk.
に.っ.ぽ.ん|nippon|Japón (lectura formal)|っ antes de p: pp.
お.お.き.い|ookii|grande|おお alarga la o.
ち.い.さ.い|chiisai|pequeño|いい alarga la i.
と.う.きょ.う|toukyou|Tokio
お.ば.あ.さ.ん|obaasan|abuela|ああ alarga la a: obaasan ≠ obasan (tía).
お.じ.い.さ.ん|ojiisan|abuelo|いい alarga la i: ojiisan ≠ ojisan (tío).
が.っ.こ.う|gakkou|escuela|っ pequeño duplica la consonante siguiente: gak-kou.
ざ.っ.し|zasshi|revista|っ antes de し: ss.
き.っ.て|kitte|sello postal|っ antes de t: tt.
きょ.う|kyou|hoy|きょ es UNA sílaba (kyo); う alarga la o.
しゃ.し.ん|shashin|foto|しゃ = sha, una sola sílaba.
お.か.あ.さ.ん|okaasan|madre|あ extra alarga la a: se sostiene el doble.
びょ.う.い.ん|byouin|hospital|びょ = byo; う alarga la o.`);
const W4=wd(`ア.メ.リ.カ|amerika|Estados Unidos
ス.ペ.イ.ン|supein|España
メ.キ.シ.コ|mekishiko|México
ア.ル.ゼ.ン.チ.ン|aruzenchin|Argentina
ビー.ル|biiru|cerveza
ジュー.ス|juusu|jugo
ミ.ル.ク|miruku|leche
サッ.カー|sakkaa|fútbol|ッ pequeño duplica la consonante: sak-kaa.
テ.ニ.ス|tenisu|tenis
ギ.ター|gitaa|guitarra
ゲー.ム|geemu|videojuego
ラ.ジ.オ|rajio|radio
ト.イ.レ|toire|baño
ド.ア|doa|puerta
ベッ.ド|beddo|cama|ッ duplica la d: bed-do.
バ.ス|basu|autobús
コン.ピュー.タ|konpyuuta|computadora
ス.マ.ホ|sumaho|celular
ノー.ト|nooto|cuaderno
ペ.ン|pen|lapicera
ア.パー.ト|apaato|departamento
レ.ス.ト.ラ.ン|resutoran|restaurante
カ.レー|karee|curry
ハ.ン.バー.ガー|hanbaagaa|hamburguesa
サ.ラ.ダ|sarada|ensalada
チョ.コ.レー.ト|chokoreeto|chocolate
ピ.ザ|piza|pizza
メ.ニュー|menyuu|menú
ト.マ.ト|tomato|tomate
バ.ナ.ナ|banana|banana
コー.ヒー|koohii|café|ー alarga la vocal anterior.
テ.レ.ビ|terebi|televisión
パ.ン|pan|pan
ケー.キ|keeki|torta
ホ.テ.ル|hoteru|hotel
ピ.ア.ノ|piano|piano
カ.メ.ラ|kamera|cámara
ア.イ.ス|aisu|helado
タク.シー|takushii|taxi`);
const W5=wd(`こ.ん.ば.ん.は|konbanwa|buenas noches (saludo)|は se lee «wa» en este saludo.
お.や.す.み|oyasumi|buenas noches (para dormir)
す.み.ま.せ.ん|sumimasen|disculpe / permiso
ご.め.ん.な.さ.い|gomennasai|perdón
お.ね.が.い.し.ま.す|onegaishimasu|por favor
は.い|hai|sí
い.い.え|iie|no
わ.か.り.ま.す|wakarimasu|entiendo
わ.か.り.ま.せ.ん|wakarimasen|no entiendo|ません es la forma negativa de ます.
あ.な.た|anata|tú
か.れ|kare|él
か.の.じょ|kanojo|ella
た.べ.ま.す|tabemasu|como (comer)
の.み.ま.す|nomimasu|bebo
い.き.ま.す|ikimasu|voy
み.ま.す|mimasu|miro
よ.み.ま.す|yomimasu|leo
か.き.ま.す|kakimasu|escribo
は.な.し.ま.す|hanashimasu|hablo
べ.ん.きょ.う|benkyou|estudio
し.ご.と|shigoto|trabajo
せ.か.い|sekai|mundo
に.ほ.ん.ご|nihongo|idioma japonés
え.い.ご|eigo|inglés
い.く.ら|ikura|¿cuánto cuesta?
な.ん|nan|¿qué?
お.い.し.い|oishii|rico / delicioso
た.の.し.い|tanoshii|divertido
い.ち|ichi|uno
さ.ん|san|tres
よ.ん|yon|cuatro
ろ.く|roku|seis
な.な|nana|siete
は.ち|hachi|ocho
きゅ.う|kyuu|nueve
こ.ん.に.ち.は|konnichiwa|hola|は se lee «wa» en este saludo.
お.は.よ.う|ohayou|buenos días
あ.り.が.と.う|arigatou|gracias
さ.よ.う.な.ら|sayounara|adiós
わ.た.し|watashi|yo
が.く.せ.い|gakusei|estudiante
せ.ん.せ.い|sensei|profesor/a
り.ん.ご|ringo|manzana
と.しょ.か.ん|toshokan|biblioteca
え.き|eki|estación`);
// Partículas: [frase, correcta, lectura, español, nota]
const PARTS=[['わたし（　）がくせいです','は','watashi wa gakusei desu','Yo soy estudiante','は marca el tema y se lee «wa».'],
['ほん（　）よみます','を','hon o yomimasu','Leo un libro','を marca el objeto directo y se lee «o».'],
['わたし（　）ともだち','の','watashi no tomodachi','Mi amigo','の indica posesión o pertenencia.'],
['がっこう（　）いきます','に','gakkou ni ikimasu','Voy a la escuela','に marca el destino.'],
['としょかん（　）べんきょうします','で','toshokan de benkyou shimasu','Estudio en la biblioteca','で marca el lugar donde ocurre la acción.'],
['ともだち（　）はなします','と','tomodachi to hanashimasu','Hablo con un amigo','と significa «con» (o «y» entre sustantivos).'],
['ねこ（　）います','が','neko ga imasu','Hay un gato','が marca el sujeto, sobre todo con existencia (います).'],
['これ（　）ほんです','は','kore wa hon desu','Esto es un libro','は marca el tema y se lee «wa».'],
['みず（　）のみます','を','mizu o nomimasu','Tomo agua','を marca lo que se bebe, come o lee; se lee «o».'],
['にほん（　）いきます','に','nihon ni ikimasu','Voy a Japón','に marca el destino.'],
['えき（　）ともだちにあいます','で','eki de tomodachi ni aimasu','Me encuentro con un amigo en la estación','で marca el lugar donde ocurre la acción.'],
['せんせい（　）ほん','の','sensei no hon','El libro del profesor','の une dos sustantivos: «de».'],
['いぬ（　）います','が','inu ga imasu','Hay un perro','が marca lo que existe con います / あります.'],
['かぞく（　）にほんにいきます','と','kazoku to nihon ni ikimasu','Voy a Japón con mi familia','と significa «con».'],
['これはわたし（　）かさです','の','kore wa watashi no kasa desu','Este es mi paraguas','の indica pertenencia.'],
['ごはん（　）たべます','を','gohan o tabemasu','Como arroz / comida','を marca el objeto directo.'],
['がっこう（　）べんきょうします','で','gakkou de benkyou shimasu','Estudio en la escuela','で marca el lugar de la acción.']
].map((p,i)=>({id:'p:'+i,jp:p[0],ans:p[1],rd:p[2],es:p[3],note:p[4],r:[p[1]],kind:'part'}));

// Diálogos: línea|romaji|español|respuesta|romaji respuesta|español respuesta|nota. Los puntos separan palabras (para ordenar).
const dl=s=>s.trim().split('\n').map((l,n)=>{const[t,r,es,rp,rr,re,note='']=l.split('|'),syl=t.split('.');return{id:'d:'+syl.join(''),jp:syl.join(''),syl,r:[r],es,reply:rp,replyR:rr,replyEs:re,note,kind:'dlg'}});
const DLG=dl(`お.げんき.ですか？|ogenki desuka|¿Cómo estás?|はい、げんきです。|hai, genki desu|Sí, estoy bien.|か al final convierte la frase en pregunta.
おなまえ.は.なんですか？|onamae wa nan desuka|¿Cómo te llamas?|わたしのなまえはゆきです。|watashi no namae wa yuki desu|Me llamo Yuki.|は se lee «wa». なん = «qué».
はじめ.まして。|hajimemashite|Mucho gusto (primer encuentro)|よろしくおねがいします。|yoroshiku onegaishimasu|Encantado/a, un gusto.|Se dice al conocer a alguien por primera vez.
おはよう.ございます。|ohayou gozaimasu|Buenos días (formal)|おはよう。|ohayou|Buenos días (informal).|Con amigos se acorta a おはよう.
ありがとう.ございます。|arigatou gozaimasu|Muchas gracias|どういたしまして。|douitashimashite|De nada.|
ごめん.なさい。|gomen nasai|Perdón|だいじょうぶです。|daijoubu desu|No pasa nada.|
すみ.ません。|sumimasen|Disculpe / permiso|はい、なんですか？|hai, nan desuka|Sí, ¿qué desea?|Sirve para llamar la atención y también para disculparse.
これ.は.なん.ですか？|kore wa nan desuka|¿Qué es esto?|それはほんです。|sore wa hon desu|Eso es un libro.|これ = esto (cerca de mí); それ = eso (cerca de vos).
トイレ.は.どこ.ですか？|toire wa doko desuka|¿Dónde está el baño?|あそこです。|asoko desu|Está allá.|どこ = dónde.
いくら.ですか？|ikura desuka|¿Cuánto cuesta?|ひゃくえんです。|hyaku en desu|Cuesta cien yenes.|えん = yen, la moneda de Japón.
みず.を.ください。|mizu o kudasai|Agua, por favor|はい、どうぞ。|hai, douzo|Sí, aquí tiene.|を se lee «o». ください = «deme, por favor».
にほんご.が.わかり.ますか？|nihongo ga wakarimasu ka|¿Entendés japonés?|すこしわかります。|sukoshi wakarimasu|Entiendo un poco.|すこし = un poco.
どこ.から.きました.か？|doko kara kimashita ka|¿De dónde sos / venís?|アルゼンチンからきました。|aruzenchin kara kimashita|Vengo de Argentina.|から = «desde». きました = «vine».
さよう.なら。|sayounara|Adiós|また.あした。|mata ashita|Hasta mañana.|
おやすみ.なさい。|oyasumi nasai|Buenas noches (para dormir)|おやすみ。|oyasumi|Buenas noches.|`);

export const WORLDS=[
 {id:1,n:'Hiragana',e:'🌸',d:'Las 46 letras básicas',items:[...BASE,...W1]},
 {id:2,n:'Dakuten',e:'🌊',d:'Sonidos con ゛ y ゜',items:[...DAK,...W2]},
 {id:3,n:'Combinaciones',e:'⛩️',d:'ゃゅょ, っ y vocales largas',items:[...COM,...W3]},
 {id:4,n:'Katakana',e:'🗻',d:'Palabras extranjeras',items:[...kat(BASE),...kat(DAK),...kat(COM),...W4]},
 {id:5,n:'Vocabulario',e:'🏯',d:'Palabras, partículas y frases',items:[...W5,...PARTS]},
 {id:6,n:'Conversaciones',e:'💬',d:'Diálogos y respuestas reales',items:DLG}
];
export const IT={};WORLDS.forEach(w=>w.items.forEach(i=>IT[i.id]=i));
// Grupos de caracteres parecidos (combate y distractores)
export const SIM=['らり','ぬめ','はほ','るろ','われね','さち','ぎじ','ずづ','じぢ','ばぱ','ぼぽ','だた','ぐく','ごこ','ざさ','ぜせ','ぞそ','べへ','びひ','ぶふ','づつ','いり','ぬの','シツ','ソン','クタ','ウフ','ノメ','ヌス','コユ','ミシ','ワウ','ガカ','ジシ','ツソ'];
export const TIPS={し:'Es «shi», no «si».',ち:'«chi», como en «chico».',つ:'«tsu»: t+s+u en un solo golpe.',ふ:'Entre f y h, con los labios casi sin tocarse.',ら:'Fila R: una r suave de un solo toque, entre r y l. No es la rr española.',り:'«ri» con r suave, no vibrante.',る:'«ru» con r suave.',れ:'«re» con r suave.',ろ:'«ro» con r suave.',ん:'Nasal final, «n».',を:'Se lee «o»; solo marca el objeto directo.',は:'Como partícula se lee «wa».',じ:'No es la «j» española: suena como la «j» de «jam» en inglés.',ぢ:'Suena igual que じ (ji); casi no se usa.',づ:'Suena igual que ず (zu); casi no se usa.',が:'Con ゛ la k pasa a g (siempre «g» de «gato»).',ぎ:'«gi» siempre suave: como «guitarra».',ひ:'«hi»: la h es suave, no la «j» española.'};
