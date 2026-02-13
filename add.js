let currentDate = new Date();
let events = [];
let holidayCache = {};

const calendar = document.getElementById("calendar");
const monthYear = document.getElementById("monthYear");

/* ===== 日付フォーマット ===== */
function formatDateLocal(date){
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,"0");
    const d = String(date.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
}

/* ===== 春分・秋分 ===== */
function getSpringEquinox(year){
    return Math.floor(20.8431 + 0.242194*(year-1980)
        - Math.floor((year-1980)/4));
}
function getAutumnEquinox(year){
    return Math.floor(23.2488 + 0.242194*(year-1980)
        - Math.floor((year-1980)/4));
}

/* ===== 第n月曜取得 ===== */
function getNthMonday(year, month, n){
    let date = new Date(year, month, 1);
    let count = 0;
    while(true){
        if(date.getDay()===1){
            count++;
            if(count===n) break;
        }
        date.setDate(date.getDate()+1);
    }
    return formatDateLocal(date);
}

/* ===== 祝日生成（振替休日込み） ===== */
function getHolidays(year){

    if(holidayCache[year]) return holidayCache[year];

    let base = [];

    base.push(`${year}-01-01`);
    base.push(`${year}-02-11`);
    base.push(`${year}-02-23`);
    base.push(`${year}-04-29`);
    base.push(`${year}-05-03`);
    base.push(`${year}-05-04`);
    base.push(`${year}-05-05`);
    base.push(`${year}-08-11`);
    base.push(`${year}-11-03`);
    base.push(`${year}-11-23`);

    base.push(getNthMonday(year,0,2));
    base.push(getNthMonday(year,6,3));
    base.push(getNthMonday(year,8,3));
    base.push(getNthMonday(year,9,2));

    base.push(`${year}-03-${String(getSpringEquinox(year)).padStart(2,"0")}`);
    base.push(`${year}-09-${String(getAutumnEquinox(year)).padStart(2,"0")}`);

    let dates = base.map(d=>new Date(d));

    // 国民の休日
    dates.sort((a,b)=>a-b);
    for(let i=0;i<dates.length-1;i++){
        let diff=(dates[i+1]-dates[i])/(1000*60*60*24);
        if(diff===2){
            let mid=new Date(dates[i]);
            mid.setDate(mid.getDate()+1);
            dates.push(mid);
        }
    }

    // 振替休日
    let extra=[];
    dates.forEach(d=>{
        if(d.getDay()===0){
            let sub=new Date(d);
            do{
                sub.setDate(sub.getDate()+1);
            }while(
                sub.getDay()===0 ||
                dates.some(x=>formatDateLocal(x)===formatDateLocal(sub)) ||
                extra.some(x=>formatDateLocal(x)===formatDateLocal(sub))
            );
            extra.push(sub);
        }
    });

    dates = dates.concat(extra);

    let unique=[...new Set(dates.map(d=>formatDateLocal(d)))];

    holidayCache[year]=unique;
    return unique;
}

function isHoliday(date){
    return getHolidays(date.getFullYear())
        .includes(formatDateLocal(date));
}

/* ===== カレンダー描画 ===== */
function renderCalendar(){

    calendar.innerHTML="";

    const year=currentDate.getFullYear();
    const month=currentDate.getMonth();

    monthYear.textContent=`${year}年 ${month+1}月`;

    const firstDay=new Date(year,month,1);
    const startDay=firstDay.getDay();
    const lastDate=new Date(year,month+1,0).getDate();

    for(let i=0;i<startDay;i++){
        let div=document.createElement("div");
        div.classList.add("day","empty");
        calendar.appendChild(div);
    }

    for(let day=1;day<=lastDate;day++){

        let date=new Date(year,month,day);
        let div=document.createElement("div");
        div.classList.add("day");

        if(date.getDay()===0 || isHoliday(date)){
            div.classList.add("sunday");
        }else if(date.getDay()===6){
            div.classList.add("saturday");
        }else{
            div.classList.add("weekday");
        }

        div.innerHTML=`<strong>${day}</strong>`;

        events.forEach((e,index)=>{
            if(formatDateLocal(e.date)===formatDateLocal(date)){

                let ev=document.createElement("div");
                ev.classList.add(e.type);
                ev.textContent=e.title;

                // ★ ここが削除機能 ★
                ev.style.cursor="pointer";
                ev.onclick=function(){

                    if(confirm("削除しますか？")){
                        events.splice(index,1);
                        renderCalendar();
                    }
                };

                div.appendChild(ev);
            }
        });

        calendar.appendChild(div);
    }

    while(calendar.children.length<42){
        let div=document.createElement("div");
        div.classList.add("day","empty");
        calendar.appendChild(div);
    }
}

/* ===== 月移動 ===== */
document.getElementById("prevMonth").onclick=()=>{
    currentDate=new Date(currentDate.getFullYear(),currentDate.getMonth()-1,1);
    renderCalendar();
};
document.getElementById("nextMonth").onclick=()=>{
    currentDate=new Date(currentDate.getFullYear(),currentDate.getMonth()+1,1);
    renderCalendar();
};

/* ===== 授業登録 ===== */
document.getElementById("classForm").onsubmit=function(e){
    e.preventDefault();

    let name=className.value;
    let day=parseInt(classDay.value);
    let periodText=period.value;
    let date=new Date(startDate.value);
    let count=parseInt(classCount.value);

    for(let i=0;i<count;i++){

        while(date.getDay()!==day){
            date.setDate(date.getDate()+1);
        }

        while(isHoliday(date)){
            date.setDate(date.getDate()+7);
        }

        events.push({
            date:new Date(date),
            title:`${name} (${periodText})`,
            type:"event"
        });

        date.setDate(date.getDate()+7);
    }

    renderCalendar();
};

/* ===== 課題登録 ===== */
document.getElementById("taskForm").onsubmit=function(e){
    e.preventDefault();

    let name=taskClassName.value;
    let date=new Date(deadline.value);
    let count=parseInt(taskCount.value);

    for(let i=0;i<count;i++){

        while(isHoliday(date)){
            date.setDate(date.getDate()+7);
        }

        events.push({
            date:new Date(date),
            title:`${name} 課題`,
            type:"task"
        });

        date.setDate(date.getDate()+7);
    }

    renderCalendar();
};

renderCalendar();
