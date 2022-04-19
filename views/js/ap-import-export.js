/*** Created by hairymax on 06.07.2016. */

$(document).ready(function () {
    var cnt = 0;
    var block = 0;
    var dr, dg, dc;
    var trb, tre, tg, tc;

    dr = $("#dreg").val();     
    dg = $("#dgos").val();     
    dc = $("#dca").val();
    trb = $("#tregbeg").val();     
    tre = $("#tregend").val();
    tg = $("#tgos").val();     
    tc = $("#tca").val();

    // отправка запроса на сервер при загрузке страницы, проверяем, закрыта ли запись
    $.get("/schedule-block", {change : false}, function (data) {
        block = Number(data.block);
        dr = data.dr;           
        dg = data.dg;        
        dc = data.dc;
        trb = data.trb;         
        tre = data.tre;
        tg = data.tg;           
        tc = data.tc;
        setBlockSection (block);
    });

    // отправка запроса на сервер при нажатии на кнопку, меняем состояние записи
    $('#block-btn').click(function () {
        if (!block) block = b_type.indexOf($("#block-options").val())+1;
        else block = 0;

        if (block == 3) {
            dr = $("#dreg").val();     
            dg = $("#dgos").val();     
            dc = $("#dca").val();
            trb = $("#tregbeg").val();     
            tre = $("#tregend").val();
            tg = $("#tgos").val();     
            tc = $("#tca").val();
        } else if (block == 1 || block == 2) {
            trb = $("#tb").val();     
            tre = $("#te").val();
        }
        $.get("/schedule-block", {change : true, block : block,
            dr : dr, trb : trb, tre : tre, dg : dg, tg : tg, dc : dc, tc : tc,
            random_seed: Math.random()*10}, function (data) {
                block = Number(data.block);
                setBlockSection (block);
        });
        //alert(block);
    });

    function setBlockSection (block) {
        if (!block) {
            $("#block-section").removeClass("alert-danger").addClass("alert-success");
            $("#block-txt").html("Запись открыта");
            $("#block-btn").removeClass("btn-danger").addClass("btn-success").val("Заблокировать запись");
            $("#export-btn").addClass("disabled");
            $("#block-options").prop("disabled",false);
            $("#block-fields input").prop("disabled",false);
            $("#block-fields0 input").prop("disabled",false);
        } else {
            $("#block-section").removeClass("alert-success").addClass("alert-danger");
            $("#block-btn").removeClass("btn-success").addClass("btn-danger").val("Открыть запись");
            $("#export-btn").removeClass("disabled");
            $("#block-options").prop("disabled",true).val(b_type[block-1]);
            if (block == 1) {
                $("#block-txt").html("Страница записи заблокирована на время выгрузки");
                $("#tb").val(trb);     
                $("#te").val(tre);
                $("#block-fields0").removeClass("hidden");
                $("#block-fields0 input").prop("disabled",true);
            } 
            else if (block == 2) {
                $("#block-txt").html("Страница записи заблокирована до конца месяца");
                $("#tb").val(trb);     
                $("#te").val(tre);
                $("#block-fields0").removeClass("hidden");
                $("#block-fields0 input").prop("disabled",true);
            } 
            else if (block == 3) {
                $("#block-txt").html("Запись невозможна (ожидается расписание)");
                $("#block-fields0").addClass("hidden");
                $("#block-fields").removeClass("hidden");
                $("#block-fields input").prop("disabled",true);
                $("#dreg").val(dr);     
                $("#dgos").val(dg);     
                $("#dca").val(dc);
                $("#tregbeg").val(trb);     
                $("#tregend").val(tre);
                $("#tgos").val(tg);     
                $("#tca").val(tc);
            }
        }
    }

    // настройка опций блокировки
    var b_type = ["На время выгрузки (онлайн-запись)", "До конца месяца (онлайн-запись)", "Запись невозможна"];
    for (var i = 0; i < 3; i++) $('#block-options').append($('<option>').text(b_type[i]));

    $("#block-options").change(function () {
        var b = b_type.indexOf($("#block-options").val())+1;
        if (b == 3) {
            $("#block-fields0").addClass("hidden");
            $("#block-fields").removeClass("hidden");
            var d = ('0' + (new Date().getMonth()+1)).slice(-2) + "." + new Date().getFullYear();
            $("#dreg").val("30." + d);
            $("#dca").val("29." + d);
            $("#dgos").val("28." + d);
        }
        else {
            $("#block-fields0").removeClass("hidden");
            $("#block-fields").addClass("hidden");
        }
    });

    // При появлении новых файлов
    $('#schedule-file').on("change", function () {
        var file = $('#schedule-file').get(0).files[0];
        //alert("Filename: " + file.name + "\nType: " + file.type  + "\nSize: " + file.size + " bytes");
        var reader = new FileReader;
        reader.readAsText(file, 'cp1251');
        reader.onloadend = function (evt) {
            var html = $.parseHTML(reader.result);
            $(html).find('tr:gt(0)').each(function () {
                cnt++;
            });
            var success_html = '';
            if (cnt > 0) {
                success_html = 'Найдено ' + cnt + ' записей расписания. ' +
                    'Нажмите кнопку "Импортировать в БД", чтобы сохранить их в базе';
                $("#import-help").removeClass("alert-danger").addClass("alert-warning");
                $("#import-btn").removeClass("disabled")
            } else {
                success_html = 'Не найдено записей расписания. Загрузите другой файл.';
                $("#import-help").removeClass("alert-warning").addClass("alert-danger")
            }
            $("#import-help").html(success_html);
        };
    });

    // Отправка файла на сервер
    $('#schedule-upload').submit(function () {
        if (block) {
            $("#import-help").html("Файл загружается. Подождите.");
            if (cnt>0){
                $(this).ajaxSubmit({
                    error: function (xhr) {
                        status('Error: ' + xhr.status);
                    },
                    success: function (response) {
                        $("#import-help").removeClass("alert-warning").removeClass("alert-danger")
                            .addClass("alert-success").html(response);
                    }
                });
            } else
                $("#import-help").removeClass("alert-warning").addClass("alert-danger")
                    .html("Сначала необходимо выбрать файл!");

        } else {
            $("#import-help").removeClass("alert-warning").addClass("alert-danger")
                .html("Невозможно произвести импорт при открытой записи");
        }
        return false; // блокировка перезагрузки страницы
    });

    $('#export-btn').click(function () {
        if (block){
            $.get('/schedule-export', function (data) {
                $("#export-link").html(data.fname);
                $("#export-help").removeClass("alert-danger").removeClass("alert-warning").addClass("alert-success")
                    .html("Файл сгенерирован");
            });
        } else {
            $("#export-help").removeClass("alert-warning").removeClass("alert-success").addClass("alert-danger")
                .html("Невозможно произвести выгрузку при открытой записи");
        }
    });

});

function hide(id) {
   document.getElementById(id).setAttribute( 'style','display: none');
}
