/*** Created by hairymax on 09.07.2016. */

$(document).ready(function () {
    setTimeout(function() { location.reload(); }, 360000); // обновляем страницу каждые 6 минут

    var codes = [], docs = [];
    var ap_patient = $("#varfio").text() // имя пациента
        , ap_patbday = $("#varbday").text()
        , ap_patpolis = $("#varpolis").text()
        , ap_date = ''  // выбранная им дата приёма
        , ap_seans = '' // выбранный им сеанс
        , ap_doctor = ''// выбранный врач
        ;

    // настройка полей ввода даты рождения
    for (var i = 0; i < 12; i++) $('#pbmonth').append($('<option>').text(dateparser.mNamesP[i]));
    // $('#pbmonth option:selected').css('color', 'lightgrey');
    $("#pbday").on("input", function () { $(this).val($(this).val().substr(0, 2)); });
    $("#pbyear").on("input", function () { $(this).val($(this).val().substr(0, 4)); });
    $('.dinp, .yinp').keypress(function( k ){
        var rep = /[0-9\x25\x27\x24\x23]/;
        var c = String.fromCharCode(k.which);
        return !!(k.which==0||k.which==8||k.which==9||k.which==13||c.match(rep));
    });//.keypress(function(e) { if (!(e.which > 47 && e.which < 58)) return false; });

    // блок отображения данных для повторной попытки записи (если в предыдущей возник конфликт)
    $("#appointment-patient").keypress(function( k ){
        var rep = /[a-zA-Z а-яА-Я\x25\x27\x24\x23]/;
        var c = String.fromCharCode(k.which);
        return !!(k.which==0||k.which==8||k.which==9||k.which==13||c.match(rep));
    });
    $("#appointment-patient").val(ap_patient);
    $("#appointment-ppolis").val(ap_patpolis);
    var d = $("#varbday").text().split('-');
    $("#pbday").val(d[2]);
    d[1] = (d[1] == undefined) ? '1' : d[1];
    $("#pbmonth").val(dateparser.mNamesP[Number(d[1])-1]);
    $("#pbyear").val(d[0]);

    var formValid = false;
    $('#appointment-ok').click(function () {
        var patientValid, patbdayValid, seansValid;
        var errstr = "Проверьте правильность ввода", errmsg = errstr;
        ap_patient = $("#appointment-patient").val();
        if (ap_patient.length < 2) {
            $("#appointment-patient").parent().addClass('has-error');
            errmsg += " ФИО";
            patientValid = false;
        } else {
            $("#appointment-patient").parent().removeClass('has-error');
            patientValid = true;
            ap_patient = FIOtoNormalCase(ap_patient);
        }

        ap_patbday = $("#pbyear").val() + '-'
            + ('0' + (dateparser.mNamesP.indexOf($("#pbmonth").val())+1) ).slice(-2) + '-'
            + ('0' + $("#pbday").val()).slice(-2);
        var dt = new Date(ap_patbday);
        var tomorrow = new Date(new Date().getTime() + 12 * 60 * 60 * 1000);
        if (dt == 'Invalid Date' || dt > tomorrow || dt.getFullYear() < 1900) {
            $("#pbdate").addClass('has-error');
            errmsg += (errmsg == errstr) ? " даты рождения" : " и даты рождения";
            patbdayValid = false;
        } else {
            $("#pbdate").removeClass('has-error');
            patbdayValid = true;
        }

        ap_patpolis = $("#appointment-ppolis").val();

        if (ap_doctor != '') {
            $("#appointment-doctor").html('<strong>Врач: ' + ap_doctor + '.</strong>' + again_html);
            if (ap_seans != '') {
                seansValid = true;
            } else {
                $("#appointment-doctor").append("<strong class='text-danger'> Выберите время приёма!</strong>");
                seansValid = false;
            }
        } else {
            $("#appointment-doctor").html("<strong class='text-danger'>Выберите врача и время приёма!</strong>")
            seansValid = false;
        }

        if (patientValid && patbdayValid && seansValid) {
            formValid = true;
            $("#appointment-help").parent().addClass('alert-warning').removeClass('alert-danger');
        } else {
            errmsg = (errmsg == errstr) ? "Не выбран врач и время приёма" : errmsg;
            $("#appointment-help")
                .html('<p class="alert-text"><strong>' + errmsg + '</strong></p>')
                .parent().addClass('alert-danger').removeClass('alert-warning');
        }

        if (formValid) {
            $("#appointment-help").html('<p>Проверьте введённые данные.</p> ' +
                '<p>Для завершения записи нажмите Подтвердить</p>');
            var sdate = new Date(ap_date);
            $("#appointment-selector").html('<h4>Приём: ' + dateToRuStr(sdate) + ', ' + ap_seans + '</h4><br>');
            $('#appointment-btns').html("<a id='appointment-esc' class='btn btn-warning' " +
                "href='/?p=" + encodeURIComponent(ap_patient) + "&bd=" + ap_patbday + "&po=" +
                encodeURIComponent(ap_patpolis) + "' " + "style='margin-right: 20pt'>Изменить</a>" +
                "<button id='appointment-end' type='submit' class='btn btn-primary'>Подтвердить</button>");
            $('#appointment-end').click(function () {
                $.get("/put-patient",
                    {   sdate: ap_date, stime: ap_seans, doc_code: codes[docs.indexOf(ap_doctor)],
                        pat_fio: ap_patient, pat_bday: ap_patbday, pat_polis: ap_patpolis },
                    function (data) {
                        $("#appointment-ok #appointment-doctor #appointment-selector").addClass("hidden");
                        $("#appointment-btns").html("");
                        if (data == true) {
                            var print_link = "/print-talon?p=" + encodeURIComponent(ap_patient) + "&bd=" + ap_patbday +
                                "&d=" + encodeURIComponent(ap_doctor) + "&sd=" + ap_date + "&st=" + ap_seans;

                            setTimeout(function () { location.replace(print_link); }, 4000);

                            $("#appointment-help").parent().removeClass("alert-warning");

                            var success_html = '<h3>Уважаемый, <b>' + ap_patient + '</b>! Вы записаны на приём</h3>' +
                                '<h3><strong class="text-danger">Обязательно распечатайте или ' +
                                    'сохраните файл талона на приём.</h3><h3>(Печать запустится автоматически)</strong></h3>' +
                                '<br> <h4>Приём: ' + dateToRuStr(sdate) + ', ' + ap_seans + '</h4>' +
                                '<h4>Врач:  ' + ap_doctor + '</h4>';
                            $("#appointment-help").html(success_html);

                            $("#pbdate #ppolis").addClass("hidden");
                            $("#appointment-patient").addClass("hidden");
                            /*//
                                $('#appointment-btns').html("<a class='btn btn-warning' target='_blank' " +
                                "href=" + print_link + "style='margin-right: 20pt'>Открыть</a>" +
                                "<a class='btnPrint btn btn-success' href=" + print_link + ">Распечатать</a>");
                                $(".btnPrint").printPage();
                             //*/
                        }
                        else {
                            $("#appointment-help").parent().addClass("alert-danger vmargin");
                            $("#appointment-help").html("<br>" +
                                "<h4>Извините, в процессе записи данное время было занято другим пациентом, " +
                                    "или запись была временно закрыта администрацией</h4>" +
                                "<h3>Пожалуйста, выберите другое время</h3>");

                            setTimeout(function () {
                                location.replace('/?p=' + encodeURIComponent(ap_patient) + '&bd=' + ap_patbday +
                                    '&po=' + encodeURIComponent(ap_patpolis));},
                                10000);
                        }
                    });
            });
        }
    });

    var again_html = ""; //"<button id='again-btn' type='submit' class='btn'>изменить</button>";

    // получаем список врачей, отображаем их
    $.get("/docs-list", function (data) {
        var doctors_html = '<table class="table table-hover">';
        codes = data.codes;
        docs  = data.docs;
        var specs = data.specs;
        for (var i = 0; i < docs.length; i++) {
            doctors_html += '<tr>' +
                '<td class="doc_fio"><b>' + docs[i] + '</b></td><td>' + specs[i] + '</td>' +
                '</tr>'
        }
        doctors_html += '</table>';
        $("#appointment-selector").html(doctors_html);

        $('tr').css('cursor', 'pointer').click(function () {
            $("#appointment-again").removeClass('hidden')
                .attr("href", '/?p=' + encodeURIComponent($("#appointment-patient").val()) +
                '&bd=' + $("#pbyear").val() + '-' +
                    ('0' + (dateparser.mNamesP.indexOf($("#pbmonth").val())+1) ).slice(-2) + '-' +
                    ('0' + $("#pbday").val()).slice(-2) +
                '&po=' + encodeURIComponent($("#appointment-ppolis").val()));
            ap_doctor = $(this).children('.doc_fio').text();
            $.get("/doc-schedule", {doc_code: codes[docs.indexOf(ap_doctor)]}, function (data) {
                if (data.ok) {
                    var dates = [], times = [];
                    var schedule_html = '<table class="table table-striped">';
                    var schedule = data.sessions;

                    for (var i = 0; i < schedule.length; i++) {
                        times = schedule[i].split('t');
                        dates.push(times[0]);
                        schedule_html += '<tr><td class="session_day">' + dateToRuStr(dates[i]) + '</td><td>';
                        for (var j = 1; j < times.length; j++) {
                            schedule_html += '<label class="radio-inline">' +
                                '<input type="radio" name="optradio">' + times[j] + '</label>';
                        }
                        schedule_html += '</td></tr>';
                    }
                    schedule_html += '</table>';

                    $("#appointment-doctor").html(
                        '<strong>Врач: ' + ap_doctor + '</strong>' + again_html);
                    $("#appointment-selector").html(schedule_html);

                    $("#again-btn").click(function () {
                        again = true;
                    });

                    $("#appointment-selector input").on("click", function () { // :checked
                        ap_date = dates[$(this).parent().parent().parent().index()];
                        ap_seans = $(this).parent().text();
                        $("#appointment-doctor").children(".text-danger").remove();
                    });
                }
                else {
                    alert("К сожалению Ваш браузер не поддерживает некоторые функции страницы. " +
                        "Пожалуйста, попробуйте записаться через другой браузер.")}
            })
        })
    })
    //*/
})

dateparser = {
    mNames: ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"],
    mNamesP: ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"],
    dNames: ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"],
    dNamesB: ["Bоскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"],
    dNamesShort: ["вск","пнд","втр","срд","чтв","птн","сбт"],
    dNamesMin: ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"]
};

function dateToStr (date) { // YYYY-MM-DD
    return date.getFullYear() + '-'
        + ('0' + (date.getMonth()+1)).slice(-2) + '-'
        + ('0' + date.getDate()).slice(-2);
}

function dateToRuStr (datestr) { // ДД месяца ГГГГ г., деньнедели
    var date = new Date(datestr);
    return date.getDate() + ' '
        + dateparser.mNamesP[date.getMonth()] + ' '
        + date.getFullYear() + ' г., '
        + dateparser.dNames[date.getDay()]
}

function FIOtoNormalCase (fiostr) {
    var fio = fiostr.split(' ');
    var normalFIO = '';
    for (var i = 0; i < fio.length; i++) {
        normalFIO += fio[i].charAt(0).toUpperCase() + fio[i].substr(1).toLowerCase() + ' '
    }
    return normalFIO.substring(0,normalFIO.length-1)
}