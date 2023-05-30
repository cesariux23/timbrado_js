import React, { Component } from 'react'
import { Form, FormGroup, Input, Button, Label, Row, Col, Alert } from 'reactstrap'
import catalog from '../assets/catalogo.csv'
import concepts from '../assets/conceptos.xlsx'
import bancos from '../assets/bancos.json'
import indemnizacion from '../assets/indemnizacion.xlsx'
import generals from '../assets/datos_generales.xlsx'
import XLSX from 'xlsx'
import Excel from 'exceljs/dist/es5/exceljs.browser'


// components
const ShowDetails = function (props) {
    if (props.message) {
      return <Alert color={props.color || "warning"}>{props.message}</Alert>
    } else {
      return <Alert color="primary">Seleccione un archivo</Alert>
    }
}

//main class
class Timbrado extends Component {

  constructor(props) {
    super(props);
    this.state = {
      envio: 0,
      tipo_nomina: 1,
      ejercicio: 2022,
      quincena: '01',
      periodo: 0,
      qna:'00',
      descripcion: '',
      fechaInicio: '',
      fechaFin: '',
      fechaPago: '',
      plantilla: false,
      color: "primary",
      message: '',
      diasPagados: 0,
      catalogo: [],
      hasError: true,
      esFiniquito: false,
      periodos_variados: false,
    };

    // Se cargan catalogos
    
    /* set up async GET request */
    var req = new XMLHttpRequest();
    var self = this;
    req.open("GET", catalog, true);
    req.responseType = "arraybuffer";
    req.onload = function(e) {
      var data = new Uint8Array(req.response);
      var workbook = XLSX.read(data, {type:"array", codepage:1251});
      self.setState({catalogo: XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])});
    }
    req.send();

    this.handleChange = this.handleChange.bind(this);
    this.handleFiles = this.handleFiles.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.calculaPeriodo = this.calculaPeriodo.bind(this);
    this.loadFile = this.loadFile.bind(this);
    //this.handleSubmit = this.handleSubmit.bind(this);

    // Patrón para validar el nombre del archivo
    this.fileName = /^(20\d{2})([012]\d)?_(retro|agui|extra|finiquito|[a-z]{3})?.*(base|conf|compen|edd|b|c|h[1-4]|nsal|v).*\.xls(x)?/i;

    //patron para la validacion de RFC
    this.RfcPatter = /[A-Z]{4}\d{6}[A-Z0-9]{3}/i;

    //patron para la validacion de curp
    this.CurpPatter = /[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}/i;

    this.meses = {
      'ENE': 'ENERO',
      'FEB': 'FEBRERO',
      'MAR': 'MARZO',
      'ABR': 'ABRIL',
      'MAY': 'MAYO',
      'JUN': 'JUNIO',
      'JUL': 'JULIO',
      'AGO': 'AGOSTO',
      'SEP': 'SEPTIEMBRE',
      'OCT': 'OCTUBRE',
      'NOV': 'NOVIEMBRE',
      'DIC': 'DICIEMBRE'
    };
    this.dataFields = {
      'all': [
        'RFC',
        'CURP',
        'ADSCRIPCION',
        'NOMBRE',
        'TPERCEP',
        'TDEDUC',
        'TNETO',
        'CURP',
        'NCUENTA',
        'BANCO',
        'NOMBRE_PUESTO',
        'CP',
      ],
      'plantilla': [
        'CODIGO',
        'FECHAING',
        'BASECONF',
        'NOEMPEADO',
        'CORREO',
        'NSS',
      ]
    };
  }

  handleChange(event) {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  calculaPeriodo(tipo, valores) {
    var descripcion = '';
    var fi = '';
    var ff = '';
    var anio = parseInt(valores.ejercicio)
    var arrayMeses = Object.keys(this.meses);
    switch (tipo) {
      case 'm':
        descripcion = this.meses[valores.quincena] + ' DE ' + valores.ejercicio + ' ' + valores.prefijo;
        // se calculan las fechas
        fi = new Date(anio, arrayMeses.indexOf(valores.quincena), 1);
        ff = new Date(anio, arrayMeses.indexOf(valores.quincena)+1, 0);
        valores.diasPagados = 30;
        valores.qna = String(arrayMeses.indexOf(valores.quincena)+1).padStart(2,'0');
        break;
      case 'q':
        var segunda = valores.quincena % 2 === 0;
        var mes = ((segunda ? parseInt(valores.quincena) : parseInt(valores.quincena) + 1) / 2) - 1;
        valores.qna = String(parseInt(valores.quincena)).padStart(2,'0');

        // se calculan las fechas
        fi = new Date(anio, mes, 1);
        ff = new Date(anio, mes, 15);
        if (segunda) {
          fi = new Date(anio, mes, 16);
          ff = new Date(anio, mes + 1, 0);
        }
        valores.diasPagados = 15; //mes === 1 ? this.calculaDias(fi, ff) : 15;
        var nombre_mes = arrayMeses[mes];
        descripcion = (segunda ?'SEGUNDA' : 'PRIMERA') + ' QUINCENA DEL MES DE '+ this.meses[nombre_mes] + ' DE ' + valores.ejercicio + ' ' + valores.prefijo;
        break;
      default:
       descripcion = '';
       valores.qna ='00';
       valores.diasPagados = 1; // lo minimo permitido en el reporte es 1 dia
    }
    valores.fechaInicio = fi.toISOString().substr(0, 10);
    valores.fechaFin = ff.toISOString().substr(0, 10);
    // se determina la fecha de pago si es día de fin de la quincena es fin de semana
    let fp = new Date(ff);
    // Si el mes tiene 31 días se corrige 30
    if(fp.getDate() === 31){
      fp.setDate(30);
    }
    if(fp.getDay() === 0 || fp.getDay() === 6){
      fp.setDate(fp.getDate() - (fp.getDay() === 6 ? 1: 2))
    }
    valores.fechaPago= fp.toISOString().substr(0, 10);
    return descripcion;
  }

  handleFiles(event) {
    var file = event.target.files[0];
    if (file === undefined) {
      this.setState({ message: 'Seleccione un archivo', color: "danger"});
      return
    }
    var coincidencias = this.fileName.exec(file.name);
    var valores = {
      quincena: '01',
      ejercicio: 2022,
      tipo_nomina: 1,
      periodo: 0,
      qna:0, // prefijo del periodo que se utlizará en la nomina
      envio: 0,
      descripcion: '',
      fechaInicio: '',
      fechaFin: '',
      fechaPago: '',
      plantilla: false,
      seguridad_social: 'Ninguno',
      message: '',
      diasPagados: 1,
      esFiniquito: false,
    };
    if (coincidencias) {
      if (coincidencias[1]) {
        valores.ejercicio = coincidencias[1];
      }
      if (coincidencias[2]) {
        valores.quincena = coincidencias[2];
      }
      // tipo de nomina
      if (coincidencias[4]) {
        valores.prefijo = coincidencias[4].toUpperCase();
        switch (valores.prefijo) {
          case 'BASE':
          case 'NSAL':
          case 'B':
            valores.tipo_nomina = 1;
            valores.plantilla = true;
            if (valores.prefijo === "NSAL") {
              valores.envio = 9
            }
            break;
          case 'CONF':
          case 'C':
            valores.tipo_nomina = 2;
            valores.plantilla = true;
            break;
          case 'COMPEN':
          case 'EDD':
            valores.tipo_nomina = 3;
            valores.plantilla = true;
            break;
          case 'H1':
            valores.tipo_nomina = 4;
            break;
          case 'H2':
              valores.tipo_nomina = 5;
              break;
          case 'H3':
            valores.tipo_nomina = 6;
            break;
          case 'H4':
            valores.tipo_nomina = 7;
            break;
          case 'V':
            valores.tipo_nomina = 0;
            break;
          default:
            valores.tipo_nomina = 9;
        }
      }
      //tipo de emision
      if (coincidencias[3]) {
        // periodos no quincenales
        valores.tipo_emision = 'E';
        switch (coincidencias[3].toUpperCase()) {
          case 'EXTRA':
          case 'FINIQUITO':
          case 'AGUI':
          case 'RETRO':
            valores.periodo = 2;
            valores.qna = '00';
            let periodo =  coincidencias[3].toUpperCase();
            this.calculaPeriodo('q', valores);
            let fechaP = valores.fechaPago;
            if (periodo !== "AGUI") {
              --valores.quincena;
              this.calculaPeriodo('q', valores);
              valores.quincena++;
              valores.qna++;
            }
            if (periodo === 'FINIQUITO') {
              valores.esFiniquito = true
            }
            // se sobreescriben la fecha de inicio
            valores.fechaInicio = new Date(valores.ejercicio, 0, 1).toISOString().substr(0, 10);
            valores.fechaPago = fechaP;
            valores.descripcion = "PAGO DE " + periodo + " " + valores.prefijo;
            valores.diasPagados = 1;

            break;
          default:
            //mensual
            valores.tipo_emision = 'O';
            valores.quincena = coincidencias[3].toUpperCase();
            valores.periodo = 1;
            valores.descripcion = this.calculaPeriodo('m', valores);
        }
      }  else {
        // pago Quincenal
        // se debe determinar la quincena en la cual se esta aplicando el pago
        valores.periodo = 0;
        valores.tipo_emision = 'O';
        valores.descripcion = this.calculaPeriodo('q', valores);
      }

      this.setState(valores);

      // los datos iniciales del timbrado estan completos
      // ahora hay que validar el contenido del Archivo

      // lectura del Archivo
      const reader = new FileReader();
      reader.addEventListener("load", this.loadFile);
      reader.readAsBinaryString(file);

    } else {
      this.setState({ message: 'El nombre de archivo no coincide con el formato establecido', color: "danger"});
    }
  }

  calculaDias (i, f) {
    let diff = f-i;
    return Math.round(diff/(1000*60*60*24)) + 1;
  }

  parseDate = (date) => {
    return date.split('-').reverse().join('/');
  }

  convierteFecha(f) {
    let fecha = new Date(Math.round((f - 25569)*86400*1000));
    return this.parseDate(fecha.toISOString().substring(0, 10))
  }

  // carga del archivo de nomina
  loadFile (event) {
    this.setState({hasError: true});
    var data = event.target.result;
    var color = "danger";
    let wb = XLSX.read(data, {type: 'binary'});
    let names = wb.SheetNames;
    let datos = [];
    let hasError = false;

    //funcion para validar campos mediante patrones
    const validaPattern = (hoja, base, pattern, field) => {
        let i = 0;
        if(!base.slice(1).every(e => {
          i++;
          return pattern.test(e[field])
        })) {
          this.setState({message: `Hoja '${hoja}', linea ${i} .- ${field} con formato invalido: ${base[i][field]}`, color});
          return true;
        }
        return false;
      }
    let percepciones = [];
    let deducciones = [];
    names.forEach( name => {
      let base = XLSX.utils.sheet_to_json(wb.Sheets[name], {header:1});
      //verifica los encabezados minimos necesarios
      let encabezados =base[0].map(e => String(e).toUpperCase().trim());
      const faltantes = [];
      let fields = this.dataFields.all;
      //valores requeridos para los empleados de plantilla
      fields = this.state.plantilla ? fields.concat(this.dataFields.plantilla) : fields;
     fields.forEach(item => {
        if(encabezados.indexOf(item) < 0) {
          faltantes.push(item);
        }
      })
      if (faltantes.length) {
        this.setState({message: `Hoja '${name}' .- No existen las columnas: ${faltantes.join(', ')}`, color});
        hasError = true;
        return false;
      }

      // cuando en el archivo se especifique un periodo se notificará al usuario
      if(encabezados.indexOf('INICIO') >= 0){
        console.log(encabezados.indexOf('INICIO'))
        this.setState({periodos_variados: true});
      }
      // valida las columnas de los conceptos
      this.state.catalogo.forEach(cat => {
        if (encabezados.includes(cat.KEY)) {
          if (cat.TIPO === 1) {
            if (percepciones.indexOf(cat) < 0) {
              percepciones.push(cat);
            }
          } else {
            if (deducciones.indexOf(cat) < 0) {
              deducciones.push(cat);
            }
          }
        }
      });

      // valida que existan conceptos
      if (percepciones.length === 0 || deducciones.length === 0) {
        this.setState({message: `Hoja '${name}' .- debe contener por lo menos un concepto.`, color});
        hasError = true;
        return false;
      }

      //genera la base con la nomina
      base = base.slice(1).map(function(x) { var o = {}; encabezados.forEach(function(h, i) { o[h] = x[i]}); return o; })

      if (!hasError) {
        // valida rfc
        hasError = validaPattern(name, base, this.RfcPatter, 'RFC');      
      }
      if (!hasError) {
        // valida curp
        hasError = validaPattern(name, base, this.CurpPatter, 'CURP');      
      }
      if (!hasError) {
        // se determina informacion propia de cada empleado
        base.forEach(e => {
          let plantilla = Object.keys(e).includes('BASECONF') ? e['BASECONF'] : '';
          e.CORREO = e.CORREO || 'ver_rechum@inea.gob.mx';
          e.cc = e.CORREO === 'ver_rechum@inea.gob.mx' ? '' : 'ver_rechum@inea.gob.mx';
          e.sexo = e.CURP.substr(10,1) === 'H' ? 'M' : 'F';
          e.turno = 'MIXTO';
          switch (plantilla) {
            case 'B':
            case 'C':
              e.sindicalizado = plantilla === 'B' ? 'Sí' : 'No';
              e.situacion_administrativa = plantilla === 'B' ? 'BASE' : 'CONFIANZA';
              e.NSS = e.NSS || '0000000000';
              e.FECHAING = new Date(Math.round((e.FECHAING - 25569)*86400*1000));
              // en los finiquitos no llevan registro patronal
              e.patronal = this.state.esFiniquito ? '': '06030087';
              e.riesgo = '1';
              // para poder especificar los finiquitos es necesario establecer el regimen como "Indemnización o Separación (13) y contrato en 99"
              e.regimen = this.state.esFiniquito ? '13': '02'
              e.contrato = this.state.esFiniquito ? '99': '01';
              e.seguridad_social = 'ISSSTE';
              // BASE es matutino
              if (plantilla === 'B') {
                e.turno = 'MATUTINO';
              }

              break;
            default:
              e.sindicalizado = false;
              e.situacion_administrativa = 'EVENTUAL';
              e.seguridad_social = 'NINGUNO';
              e.NSS = '';
              e.patronal = '';
              e.riesgo = '';
              e.FECHAING = '';
              e.regimen = '09';
              e.contrato = '99';
              break;
          }
        })
        datos = datos.concat(base);
      }
    });

    if (!hasError) {
      //cuenta los registros
      this.setState({base:datos, percepciones, deducciones, message:`${datos.length } registros en el archivo de nomina. ${percepciones.length} percepciones, ${deducciones.length} deducciones. ${this.state.esFiniquito? 'Este archivo pertenece a un FINIQUITO.': ''} ${this.state.periodos_variados? 'Se utilizarán las fechas establecidas en las columnas INICIO, FIN y PAGO': ''} Listo para procesar.`, hasError: false, color: 'success'});
    }
  }
  handleSubmit (event) {
    // Generacion de datos generales
    const folioBase = [this.state.ejercicio.substr(2,2), this.state.qna, this.state.periodo, this.state.tipo_nomina, this.state.envio].join("");
    let incremental = 1;
    const generales = [];
    const conceptos = [];
    const separacion = []
    const serie = 'IVE';
    const emision = this.state.tipo_emision;
    const inicio = this.parseDate(this.state.fechaInicio);
    const fin = this.parseDate(this.state.fechaFin);
    const pago = this.parseDate(this.state.fechaPago);
    let diasPagados = this.state.diasPagados;
    const recibos = {generales:{quincena: this.state.descripcion, inicio, fin}, empleados: []}

    let periodo = '99';
    switch (this.state.periodo) {
      case 0:
        periodo = '04'
        break;
      case 1:
        periodo = '05'
        break;
      default:
        periodo = '99';
        break;
    }
    // se recorre la base
    this.state.base.forEach(e => {
      let datos = [];
      let percepciones = 0;
      let deducciones = 0;
      let totalGravado = 0;
      let totalExcento = 0;
      let ISR = 0;
      let otros = 0;
      let totalSeparacion = 0
      let folio =folioBase.concat(String(incremental++).padStart(3,'0'));
      let recibo = { datos: {consecutivo: incremental-1}, percep: [], deduc:[]}

      let cont = 1;
      this.state.percepciones.forEach(p => {
        let desglose = [];
        let valSeparacion = 0
        // se valida el monto

        let valor =parseFloat(parseFloat(e[p.KEY]).toFixed(2));
        if (valor>0) {
          let excento = 0;
          // se valida el monto excento
          if (p.EXENTO === 1) { 
            // busca dentro de los conceptos la parte excenta
            excento = e[ p.KEY + "_EXE"] ? parseFloat(parseFloat(e[p.KEY + "_EXE"]).toFixed(2)) : 0;
            
            // La prima de antiguedad por renuncia es excenta
            if(p.KEY === 'ANT_RENUNCIA') {
              excento = parseFloat(e[p.KEY]).toFixed(2)
              valSeparacion = excento
            }
          }
           // otros pagos
          if (p.OTROS) {
            otros = otros + valor;
          }
          let grabado = valor - excento;
         
          // linea del desglose
          desglose.push(folio);
          desglose.push(String(cont++));
          desglose.push(String(p.TIPO));
          desglose.push(String(p.CLAVE));
          desglose.push(p.DESCRIPCION);
          desglose.push(String(p.TIPO_SAT).padStart(3,'0'));
          desglose.push(grabado);
          desglose.push(excento);
          percepciones += Math.round(valor*100)/100;
          totalGravado += Math.round(grabado*100)/100;
          totalExcento += Math.round(excento*100)/100;
          if (valSeparacion > 0) {
            // SE ESPECIFICA DESGOSE PARA LOS PAGO POR SEPARACIÓN
            let acomulable = parseFloat(valSeparacion) - parseFloat(e['SUELDO_MENSUAL_ORD'])
            const desglose_sep = [
              folio,
              parseFloat(valSeparacion),
              String(e['ANIO_SERV']),
              e['SUELDO_MENSUAL_ORD'],// sueldo mensual
              e['SUELDO_MENSUAL_ORD'],
              // el acomulable es antiguedad -  el sueldo mensual
              parseFloat(acomulable),
            ]
            separacion.push(desglose_sep)
            totalSeparacion =+ valSeparacion
          }

          conceptos.push(desglose);
          recibo.percep.push(desglose)
        } 
      });

      // 2020: Se tiene que informar el subsidio causado
      // por lo que se adiciona a todo el personal de base
      if (e.regimen === '02') {
        let desglose = [];
        // linea del desglose
        desglose.push(folio);
        desglose.push(String(cont++));
        desglose.push(String(3));
        desglose.push(String('SC20'));
        desglose.push('Subsidio para el Empleo');
        desglose.push('002');
        desglose.push(0.0);
        desglose.push(0.0);
        conceptos.push(desglose);
      }

      this.state.deducciones.forEach(p => {
        let desglose = [];
        // se valida el monto
        let valor = parseFloat(parseFloat(e[p.KEY]).toFixed(2));
        if (valor>0) {
          // se valida el monto excento
          let excento = valor;
          let grabado = 0;
          // linea del desglose
          desglose.push(folio);
          desglose.push(String(cont++));
          desglose.push(String(p.TIPO));
          desglose.push(String(p.CLAVE));
          let descripcion = p.DESCRIPCION
          // if(p.KEY === 'PCP') {
          //   // para los prestamos a corto plazo se agregará el record en la descripción
          //   if(e['QNASPREST'] && e['QNASPREST'] !== '/') {
          //     descripcion += ', PAGO ' + e['QNASPREST']
          //   }
          // }
          desglose.push(descripcion);
          desglose.push(String(p.TIPO_SAT).padStart(3,'0'));
          desglose.push(grabado);
          desglose.push(excento);
          deducciones += Math.round(valor*100)/100;
          if (p.KEY === 'ISR') {
            ISR = parseFloat(parseFloat(e[p.KEY]).toFixed(2));
          }
          conceptos.push(desglose);
          recibo.deduc.push(desglose);
        } 
      });      

      let tpercep = e['TPERCEP'];
      let tdeduc = e['TDEDUC'];
      if (Math.round(tpercep - percepciones) > 0 || Math.round(tpercep - percepciones) < 0) {
        alert('Diferencias percepciones: ' + e['RFC'] + ' -- ' + Math.round(tpercep - percepciones));
        return false;
      }
      if (Math.round(tdeduc - deducciones) > 0 || Math.round(tdeduc - deducciones) < 0) {
        alert('Diferencias deducciones: ' + e['RFC'] + ' -- ' + Math.round(tdeduc - deducciones));
        return false;
      }

      datos.push(folio);
      datos.push(serie);
      percepciones = Math.round(percepciones*100)/100;
      deducciones = Math.round(deducciones*100)/100;
      datos.push(percepciones);
      datos.push(deducciones);
      let neto = Math.round((percepciones-deducciones)*100)/100;
      datos.push(neto);
      recibo.datos.neto = neto;
      datos.push('91030') // expedicion
      datos.push(e['RFC']);
      recibo.datos.rfc = e['RFC'];
      datos.push(e['NOMBRE']);
      recibo.datos.nombre = e['NOMBRE'];
      datos.push(percepciones); // v. unitario
      datos.push(percepciones); // importe
      datos.push(emision); // tipo nomina
      if(this.state.periodos_variados){
        //Se toman los valores establecidos para los valores del periodo
        datos.push(this.convierteFecha(e['PAGO'])); // f pago
        datos.push(this.convierteFecha(e['INICIO']))// f inicio
        datos.push(this.convierteFecha(e['FIN'])); // f fin
        diasPagados = 1
      } else {
        datos.push(pago); // f pago
        datos.push(inicio); // f inicio
        datos.push(fin); // f fin
      }
      datos.push(Number(diasPagados)); // dias pagados
      datos.push(percepciones);
      datos.push(deducciones);
      recibo.datos.percepciones = percepciones;
      recibo.datos.deducciones = deducciones;
      // otros pagos
      // Se agrega el acomulado, si no hay será 0.
      datos.push(otros);
      datos.push(e.patronal); // patronal
      datos.push('IF'); // origen del recurso
      datos.push(0); // Rec propio
      datos.push(e['CURP']);
      recibo.datos.curp = e['CURP'];
      datos.push(e.NSS); // Num seguro
      // antiguedad
      if (e.sindicalizado) {
        datos.push(this.parseDate(e.FECHAING.toISOString().substr(0, 10)));// fecha ingreso
        // Ahora la antiguedad la calculará el sistema de sefiplan
        datos.push('CALCULA');
      } else {
        datos.push(''); //ingreso
        datos.push(''); // antiguedad
      }
      datos.push(e.contrato); // contrato
      datos.push(e.sindicalizado || ''); // sindicalizado
      datos.push('01'); // jornada
      datos.push(e.regimen); // regimen
      datos.push(e['NOEMPEADO'] ? e['NOEMPEADO'] : '0'); // no. empleado
      recibo.datos.no_emp = e['NOEMPEADO'];
      datos.push(e['ADSCRIPCION'].replace('.', '').replace(',',''));
      recibo.datos.adscripcion = e['ADSCRIPCION'].replace('.', '').replace(',','');
      datos.push(e['NOMBRE_PUESTO']); // puesto
      recibo.datos.puesto = e['NOMBRE_PUESTO'];
      recibo.datos.codigo = e['CODIGO'];
      datos.push(e.riesgo); // riesgo
      datos.push(periodo); // periodicidad
      // DATOS DEL PAGO
      // Si se define el campo CLABE, entonces se debe agregar la clabe y omitir el valor para banco
      if(e['CLABE']) {
         datos.push('') //banco
         datos.push(String(e['CLABE'])) //cuenta
      } else {
        datos.push( bancos[e['BANCO']] ? bancos[e['BANCO']] : ''); // banco
        let cuenta = String(e['NCUENTA'])
        cuenta = cuenta.length < 11 ? '0'.repeat(11 - cuenta.length) + cuenta : cuenta
        datos.push(bancos[e['BANCO']] ? cuenta : ''); // cuenta
      }
      datos.push(0); // salario aportaciones
      datos.push(e.sindicalizado && periodo !== '99' ? Math.round((percepciones/diasPagados)*100)/100 : 0); // salario diario
      datos.push('VER'); // estado
      datos.push(percepciones - totalSeparacion); // total sueldos
      datos.push(totalSeparacion); // indemnización
      datos.push(''); // jubilacion-pension-retiro
      datos.push(totalGravado); // grabado
      datos.push(totalExcento); // excento
      datos.push(deducciones-ISR); // otras deducciones
      datos.push(ISR); // isr
      // ESPACIOS VACIOS: 11
      let i = 1;
      while (i <= 4) {
        datos.push('');
        i++;
      }
      if(e.regimen === '02'){
        datos.push(0);
      } else {
        datos.push('');
      }
      
      i = 1;
      while (i <= 6) {
        datos.push('');
        i++;
      }
      datos.push(this.state.descripcion); // Observaciones
      datos.push(e.CORREO);// correo
      datos.push(e.cc); // cc
      datos.push(''); // trl relacionado
      datos.push(''); // uuid relacionado
      datos.push(this.state.descripcion); // descripcion del pago
      // Julio 2021:
      // Se adicionan los siguentes campos
      datos.push(e.sexo);
      datos.push(e.situacion_administrativa);
      datos.push(e.seguridad_social);
      // Feb 2023:
      // actualización timbrado 4.0
      datos.push(''+e.CP);
      datos.push(e.turno);

      generales.push(datos);
      recibos.empleados.push(recibo);
    });

    var download = function (xls64, name, isJson = false) {
      // build anchor tag and attach file (works in chrome)
      var a = document.createElement("a");
      let url = null
      if(isJson){
        url = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(xls64));
      } else {
        url = URL.createObjectURL(
          new Blob([xls64], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        );
      }

      a.href = url;
      a.download = name || "export.xlsx";
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
          },
          0);
    }

    // se escribe el archivo de los conceptos
    var req = new XMLHttpRequest();
    req.open("GET", concepts, true);
    req.responseType = "arraybuffer";
    req.onload = function(e) {
      var data = new Uint8Array(req.response);
      var workbook = new Excel.Workbook();
      workbook.xlsx.load(data).then(function () {
        var sh = workbook.getWorksheet(1)
        sh.addRows(conceptos)
        
        workbook.xlsx.writeBuffer( {
            base64: true
        })
        .then((data) => {
          download(data, folioBase + '_conceptos.xlsx')
        })
        .catch(function(error) {
            console.log(error.message);
        });
      })
    }
    req.send();

    // datos generales
    var req2 = new XMLHttpRequest();
    req2.open("GET", generals, true);
    req2.responseType = "arraybuffer";
    req2.onload = function(e) {
      var data = new Uint8Array(req2.response);
      var workbook = new Excel.Workbook();
      workbook.xlsx.load(data).then(function () {
        var sh = workbook.getWorksheet(1)
        sh.addRows(generales)

        workbook.xlsx.writeBuffer( {
            base64: true
        })
        .then((data) => {
          download(data, folioBase + '_generales.xlsx')
        })
        .catch(function(error) {
            console.log(error.message);
        });
      })
    }
    req2.send();

    if(this.state.esFiniquito){
      // se escribe el archivo Indemnización
      var req3 = new XMLHttpRequest();
      req3.open("GET", indemnizacion, true);
      req3.responseType = "arraybuffer";
      req3.onload = function(e) {
        var data = new Uint8Array(req3.response);
        var workbook = new Excel.Workbook();
        workbook.xlsx.load(data).then(function () {
          var sh = workbook.getWorksheet(1)
          sh.addRows(separacion)
          
          workbook.xlsx.writeBuffer( {
              base64: true
          })
          .then((data) => {
            download(data, folioBase + '_indemnizacion.xlsx')
          })
          .catch(function(error) {
              console.log(error.message);
          });
        })
      }
      req3.send();
    }

    // datos para recibos
    download (recibos, folioBase +'_recibos.json', true)
      
  }

  render () {
    return (
      <Form>
        <h2>Timbrado de Nomina</h2>
        <hr></hr>
        <Row>
          <Col>
            <FormGroup>
              <Label for="archivo">Archivo de nomina</Label>
              <Input id="archivo" name="archivo" type="file" onChange={this.handleFiles}/>
            </FormGroup>
          </Col>
          <Col sm={3}>
            <FormGroup>
              <Label for="tipo_nomina">Tipo de nomina</Label>
              <Input name="tipo_nomina" type="select" value={this.state.tipo_nomina} onChange={this.handleChange}>
                <option value="0">----VIATICOS----</option>
                <option value="1">Base</option>
                <option value="2">Confianza</option>
                <option value="3">EDD</option>
                <option value="4">(H1) Asimilados federales</option>
                <option value="5">(H2) Asimilados estatales</option>
                <option value="6">(H3) Asimilados Genero</option>
                <option value="7">(H4) Asimilados Acceso</option>
                <option value="9">Otro</option>
              </Input>
            </FormGroup>
          </Col>
          <Col sm={3}>
            <FormGroup>
              <Label for="emision">Periodo</Label>
              <Input name="emision" type="select" value={this.state.periodo} onChange={this.handleChange} disabled>
                <option value="0">Quincenal</option>
                <option value="1">Mensual</option>
                <option value="2">otro</option>
              </Input>
            </FormGroup>
          </Col>
          <Col sm={2}>
            <FormGroup>
              <Label for="envio">No. envío</Label>
              <Input name="envio" placeholder="0-9" type="number" max="9" min="0" value={this.state.envio} onChange={this.handleChange}/>
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col sm={2}>
            <FormGroup>
              <Label for="ejercicio">Ejercicio</Label>
              <Input name="ejercicio" placeholder={'Año'} value={this.state.ejercicio} onChange={this.handleChange}/>
            </FormGroup>
          </Col>
          <Col sm={2}>
            <FormGroup>
              <Label for="quincena">Quincena / Mes</Label>
              <Input id="quincena" name="qna" placeholder="01-24" value={this.state.qna} onChange={this.handleChange}/>
            </FormGroup>
          </Col>
          <Col>
            <FormGroup>
              <Label for="descripcion">Descripción de la nomina</Label>
              <Input id="descripcion" name="descripcion" value={this.state.descripcion} onChange={this.handleChange}/>
            </FormGroup>
          </Col>
        </Row>

        <Row>
          <Col>
            <FormGroup>
              <Label for="fechaInicio">Fecha de inicio</Label>
              <Input id="fechaInicio" name="fechaInicio" type="date" value={this.state.fechaInicio} onChange={this.handleChange}/>
            </FormGroup>
          </Col>
          <Col>
            <FormGroup>
              <Label for="fechaFin">Fecha fin</Label>
              <Input id="fechaFin" name="fechaFin" type="date" value={this.state.fechaFin} onChange={this.handleChange}/>
            </FormGroup>
          </Col>
          <Col>
            <FormGroup>
              <Label for="fechaPago">Fecha pago</Label>
              <Input id="fechaPago" name="fechaPago" type="date" value={this.state.fechaPago} onChange={this.handleChange}/>
            </FormGroup>
          </Col>
          <Col sm={2}>
            <FormGroup>
              <Label for="fechaPago">Días pagados</Label>
              <Input id="diasPagados" name="diasPagados" type="number" value={this.state.diasPagados} onChange={this.handleChange}/>
            </FormGroup>
          </Col>
        </Row>
        <ShowDetails message={this.state.message} color={this.state.color}></ShowDetails>
        <Row>
          <Col>
          <Button color="success" onClick={this.handleSubmit} disabled={this.state.hasError}>Generar layouts</Button>
          </Col>
        </Row>
      </Form>
    );
  }
}

export default Timbrado;
