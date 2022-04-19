/*** Created by hairymax on 20.07.2016. */

var express = require('express')
	, app = express()
	//, http = require('http')
	//, html = require('html')
	//, httpServer = http.Server(app)
	, fs = require('fs')
	, iconv = require('iconv-lite')
	, jsdom = require('jsdom')
	

var multer  =   require('multer')
var storage =   multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, __dirname + '/data/upload')
    },
    filename: function (req, file, callback) {
        callback(null, 'schedule-im-' + formatDate(new Date) + '.html')
    }
})
var upload = multer({ storage : storage}).single('schedule-file')


var usr = "postgres"
var hst = "localhost"
var pwd = "1234"
var prt = 5432
var dbn = "schedule_database" //  "antispit27" //
var db_exist = false

var pgtools = require("pgtools")
var pg = require('pg')
pgtools.createdb({user: usr, host: hst, password: pwd, port: prt}, dbn, function(err, res) {
    if (err) {
        console.error(err)
        db_exist = true
    } 
    console.log(res)
})

const client = new pg.Client("pg://" +usr+ ":" +pwd+ "@" +hst+ ":" +prt+ "/" +dbn)
client.connect() 
if (!db_exist) {
    client.query("CREATE TABLE IF NOT EXISTS doctor (" +
        "code  integer NOT NULL PRIMARY KEY, " +
        "fio   varchar(100) NOT NULL, " +
        "spec  varchar(100) NOT NULL )")
    client.query("CREATE TABLE IF NOT EXISTS schedule (" +
        "sdate          date, " +
        "doctor_code    integer NOT NULL, " +
        "time_code      integer, " +
        "time_begin     varchar(10), " +
        "patient_fio    varchar(100), " +
        "patient_bday   varchar(10), " +
        "patient_polis  varchar(20), " +
        "patient_eform  varchar(100))")
}

app.use(express.static(__dirname + '/views'))

app.engine('html', require('ejs').renderFile)

var block = 0
var dr, dg, dc
var trb, tre, tg, tc

// -------------------------------------------------------------------------------- //
// Обработка запросов со страницы записи на приём
// -------------------------------------------------------------------------------- //

console.log(block + ' ' + !block + ' ' + !!block)

app.get('/', function(req, res) {
    if (!block) {
        res.render('enroll.html', {pat_fio : req.query['p'], pat_bday : req.query['bd'], pat_polis : req.query['po']})
    } else {
        res.render('block.html', {b_type : block, dr : dr, trb : trb, tre : tre, dg : dg, tg : tg, dc : dc, tc : tc}) }
})

app.get('/docs-list', function(req, res) {
    var codes = [], docs = [], specs = []
    var today = new Date('2016-09-01')

    client.query("SELECT DISTINCT doctor.code, doctor.fio, doctor.spec " +
        "FROM schedule, doctor WHERE (doctor_code = doctor.code AND patient_fio is null AND " +
        "(schedule.sdate - DATE '" + formatDate(today) + "') > 0) " +
        "ORDER BY spec, fio", 
        function(error, result, fields) {
            if (error) throw error
            //console.log(res)
            result.rows.forEach(row=>{
                codes.push(row['code'])
                docs.push(row['fio'])
                specs.push(row['spec'])
            })
            res.json({ codes : codes, docs : docs, specs : specs })
        }
    )
})

app.get('/doc-schedule', function(req, res) {
    console.log('\nЗапрос, ' + (new Date).toLocaleString() + ', на просмотр расписания врача ' + req.query['doc_code'])
    if (req.query['doc_code'] == undefined || req.query['doc_code'] == "undefined") {
        res.json({ok : false})
        console.log('Неверный код врача!')
    }
    else {
        var sessions = []
        var sdate,  t, scnt = 0
        var sdatep = "0000-01-01"
        var today = new Date('2016-09-01')

        today.setHours(0,0,0)
        client.query("SELECT schedule.sdate, schedule.time_begin FROM schedule " +
            "WHERE ((sdate - DATE '" + formatDate(today) + "') > 0 AND " +
            "doctor_code = " + req.query['doc_code'] + " AND patient_fio is null) ORDER BY sdate, time_begin",
            function(error, result, fields) {
                if (error) throw error
                //console.log(res)
                result.rows.forEach(row=>{
                    sdate = formatDate(row['sdate'])
                    if (sdate != sdatep) {
                        sessions.push(sdate+'t')
                        scnt++
                    }
                    else sessions[scnt-1] += 't'
                    sessions[scnt-1] += row['time_begin']
                    sdatep = sdate
                })
                res.json({ok : true, sessions : sessions})
            }
        )
    }
})

app.get('/put-patient', function(req, res) {
    console.log('\nЗапрос, ' + (new Date).toLocaleString() + '\n  ' + req.query['pat_fio'] + ', '
        + req.query['pat_bday'] + ' г.р., полис: ' + req.query['pat_polis'] + ', \n' +
        '  сеанс: ' + req.query['sdate'] + ', ' + req.query['stime'] + ', врач: ' + req.query['doc_code'] + '.' )
    if (block) {
        console.log('Неудачно. Запись была заблокирована в процессе' )
        res.send(!block)
    } else {
        var success
        client.query("SELECT patient_fio FROM schedule " +
            "WHERE ( doctor_code = " + req.query['doc_code'] + " AND " +
            "time_begin = '" + req.query['stime'] + "' " +
            "AND sdate = '" + req.query['sdate'] + "' )" , 
            function(error, result, fields) {
                if (error) throw error
                //console.log(res)
                result.rows.forEach(row=>{
                    success = (row['patient_fio'] == null)
                    if (success) console.log("  Сеанс свободен, проверено.")
                })
                if (success) {
                    client.query("UPDATE schedule SET patient_eform = 'интернет', " +
                        "patient_fio = '" + req.query['pat_fio'] + "', " +
                        "patient_bday = '" + req.query['pat_bday'] + "', " +
                        "patient_polis = '" + req.query['pat_polis'] + "' " +
                        "WHERE ( doctor_code = " + req.query['doc_code'] + " " +
                        "AND time_begin = '" + req.query['stime'] + "' " +
                        "AND sdate = '" + req.query['sdate'] + "' AND patient_fio is null)" )
                    console.log('  Внесение новой записи в базу в ' + (new Date).toLocaleString())
                }
                res.send(success)
            }
        )
    }
})

app.get('/print-talon', function(req, res) {
    var sdate = InternatToRuDate(req.query['sd']) + ", " +
        days.normal[(new Date(req.query['sd'])).getDay()].toLowerCase()
    var bdate = InternatToRuDate(req.query['bd'])
    res.render('print.html', {pat_fio: req.query['p'], pat_bday : bdate,
        doc_fio : req.query['d'], ap_date : sdate, ap_time : req.query['st']})
})


// -------------------------------------------------------------------------------- //
// Обработка запросов со страницы управления расписанием
// -------------------------------------------------------------------------------- //

app.get('/schedule-block', function(req, res) {
    if (req.query['change']=="true") {
        block = Number(req.query['block'])
        if (block == 3) {
            dr  = req.query['dr']     
            dg  = req.query['dg']     
            dc  = req.query['dc']
            trb = req.query['trb']     
            tre = req.query['tre']
            tg  = req.query['tg']     
            tc  = req.query['tc']
        }
        else if (block == 1 || block == 2) {
            trb = req.query['trb']      
            tre = req.query['tre']
        }
    }
    res.json({block : block, dr : dr, trb : trb, tre : tre, dg : dg, tg : tg, dc : dc, tc : tc})

    console.log("\nЗапрос на изменение блокировки : " + req.query['change'] + "      Состояние блокировки  :  " + block)
})

app.get('/page-which-address-no-one-knows', function(req, res) {
    console.log("\nСтраница управления расписанием открыта")
    res.render('page-which-address-no-one-knows.html')
})

app.get('/schedule-export', function(req, res){
    var fexname = 'schedule-ex-' + formatDate(new Date) + '.html'
    var buf = ''
    var tdl = '<td bordercolor="#c0c0c0"><font style="FONT-SIZE:10pt" face="Arial" color="#000000">'
    var tdlR = '<td bordercolor="#c0c0c0" align="RIGHT"><font style="FONT-SIZE:10pt" face="Arial" color="#000000">'
    var tdr = '</font></td>\n'
    var strhead = iconv.decode(fs.readFileSync(__dirname+'/data/schedule-head.txt'), 'win1251')
    var strfoot = '</TBODY><tfoot></tfoot></table></body></html>'

    var stream = fs.createWriteStream(__dirname+'/data/export/'+ fexname)
    stream.once('open', function(fd) {
        stream.write(iconv.encode(strhead, 'win1251'))

        client.query("SELECT " +
            "schedule.doctor_code, schedule.time_begin, schedule.sdate, schedule.time_code, " +
            "schedule.patient_fio, schedule.patient_bday, schedule.patient_eform, doctor.fio, doctor.spec " +
            "FROM schedule, doctor WHERE (doctor_code = doctor.code) ORDER BY sdate, time_begin", 
            function(error, result, fields) {
                if (error) throw error
                //console.log(res)
                result.rows.forEach(row=>{
                    var d = new Date(row['sdate'])
                    var sdstr = (row['sdate'] != null) ? InternatToRuDate(formatDate(d)) : '0'
                    var bd = new Date(row['patient_bday'])
                    var bdstr = (row['patient_bday'] != null) ? InternatToRuDate(formatDate(bd)) : '0'
                    var tstr = row['time_begin'].replace(':','-')

                    buf = '<tr valign="TOP">' +
                        tdlR + '0' + tdr +                         // Код1
                        tdlR + row['doctor_code'] + tdr +          // №ВРАЧА
                        tdl + tstr + tdr +                         // ВРЕМЯ
                        tdlR + sdstr + tdr +                       // ДАТА
                        tdlR + row['time_code'] + tdr +            // КОДВ
                        tdl + days.normal[d.getDay()] + tdr +      // ДЕНЬНЕДЕЛИ
                        tdl + ((row['patient_fio'] != null)? row['patient_fio'] : '1') + tdr +  // ПАЦИЕНТ
                        tdl + bdstr + tdr +                        // ДАТАРОЖД
                        tdl + '0' + tdr +                          // РАЙОН
                        tdl + row['patient_eform'] + tdr +         // ЗАПИСЬ
                        tdl + row['fio'] + tdr +                   // ФИОВРАЧА
                        tdl + '-1' + tdr +                         // ЛОГ
                        tdlR + '0' + tdr +                         // Код
                        tdl + '0' + tdr +                          // ЧЕТ
                        tdl + row['spec'] + tdr +                  // РЕГАЛИИ
                        tdl + (d.getDay()+1) + tdr +               // ДЕНЬКОД
                        tdl + '' + tdr +                           // КАБ
                        tdl + ((Number(tstr.split('-')[0]) < 13)? '1' : '2') + ' СМЕНА' + tdr + // СМЕНА
                        tdl + ((row['patient_polis'] != undefined)? row['patient_polis'] : '') + tdr + // ПОЛИС
                    '\n</tr>'

                    stream.write(iconv.encode(buf, 'win1251'))
                })
                stream.write(iconv.encode(strfoot, 'win1251'))
                stream.end()
                res.json({fname : fexname})
            }
        )
    })
})

app.get('/schedule-file', function(req, res){
    res.download(__dirname+'/data/export/'+ 'schedule-ex-'+ formatDate(new Date)+'.html')
})


app.post('/schedule-upload', function(req, res){ upload(req, res, function(err) {
    var fimname = 'schedule-im-' + formatDate(new Date) + '.html'
    
    if(err) {
        console.log(err)
        return res.send("Ошибка загрузки файла. Убедитесь, что он не открыт в другом придложении.")
    }
	
    var htmltext = iconv.decode( fs.readFileSync(__dirname+'/data/upload/'+ fimname), 'win1251' )
    var pos_begin = htmltext.indexOf('<TBODY>') + 7
    var pos_end = htmltext.indexOf('</TBODY>')
    if(pos_end == -1) {
        pos_begin = htmltext.indexOf('<tbody>') + 7
    	  pos_end = htmltext.indexOf('</tbody>')
	      if(pos_end == -1) {
            console.log("Неверное содержимое файла")
            return res.send("Ошибка загрузки файла. Неверное содержимое.")
	      }
    }

    htmltext = htmltext.substring(pos_begin, pos_end)
	  console.log('\nЗагрузка файла. Поз: начало ' + pos_begin +  ', конец ' + pos_end + '\n ')

    var sdate, pfio, pbday, ppolis, peform
    client.query("DELETE FROM schedule")
    var doc_code = [], docC, docFIO, docSpec
    client.query("DELETE FROM doctor")
    var timeC, timeT
    var dcnt = 0, cnt = 0

    jsdom.env("<html><body></body></html>", [__dirname+'/views/js/jquery-1.11.1.min.js'], function (err, window) {
	    var $ = window.jQuery
	    $('body').append( htmltext )
	    $('body').find('tr').each(function(){
            docC = Number($(this).children('td:eq(1)').text())
            if (doc_code.indexOf(docC) == -1) {
                doc_code.push( docC )
                docFIO = FIOtoNormalCase( $(this).children('td:eq(10)').text() )
                docSpec = $(this).children('td:eq(14)').text()
                client.query("INSERT INTO doctor VALUES (" + docC + ", '" + docFIO + "', " + "'" + docSpec + "')")
                dcnt++
            }
    	})
	    console.log("Список врачей сформирован (" + dcnt + " врачей)")

        //console.log($('body').find('tr'))
	    var pfiostr, pbdaystr
	    $('body').find('tr').each(function(){
            sdate = RuToInternatDate($(this).children('td:eq(3)').text())
            docC = Number($(this).children('td:eq(1)').text())
            timeC = Number($(this).children('td:eq(4)').text())
            timeT = $(this).children('td:eq(2)').text().replace('-',':')
            pfio = $(this).children('td:eq(6)').text()
            pbday = $(this).children('td:eq(7)').text()
            ppolis = $(this).children('td:eq(18)').text()
            peform = $(this).children('td:eq(9)').text()
            cnt++

            pfiostr = (pfio != '1')? "'"+pfio+"'" : "null"
            pbdaystr = (pbday != '0')? "'"+RuToInternatDate(pbday)+"'" : "null"
            client.query("INSERT INTO schedule VALUES ('" +
            sdate + "', " + docC + ", " + timeC + ", '" + timeT + "', " +
            pfiostr + ", " + pbdaystr + ", '" + ppolis + "', '" + peform + "')")
        })
        res.send("Импорт завершён. Список из " + dcnt + " врачей сформирован. " +
             "Загружено " + cnt + " записей расписания.")
        console.log("Импорт завершён. В базу перенесено записей: " + cnt)
	  })	
  })
})

days = {
    normal: ["Bоскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"],
    large: ["BОСКРЕСЕНЬЕ","ПОНЕДЕЛЬНИК","ВТОРНИК","СРЕДА","ЧЕТВЕРГ","ПЯТНИЦА","СУББОТА"]
}

function RuToInternatDate (dstr) {
    var d = dstr.split('.')
    return d[2] + '-' + ('0' + d[1]).slice(-2) + '-' + ('0' + d[0]).slice(-2)
}

function InternatToRuDate (dstr) {
    var d = dstr.split('-')
    return ('0' + d[2]).slice(-2) + '.' + ('0' + d[1]).slice(-2) + '.' + d[0]
}

function FIOtoNormalCase (fiostr) {
    var fio = fiostr.split(' ')
    var normalFIO = ''
    for (var i = 0; i < fio.length; i++) {
    	normalFIO += fio[i].charAt(0).toUpperCase() + fio[i].substr(1).toLowerCase() + ' '
    }
    return normalFIO.substring(0,normalFIO.length-1)
}

function formatDate(d) {
	return d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) 
}

console.log("\n\n********************************************************************\n" +
    "              СЕРВЕР ЗАПУСТИЛСЯ : " + (new Date).toLocaleString())

app.listen(8080)
