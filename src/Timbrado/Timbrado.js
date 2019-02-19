import React, { Component } from 'react';
import { Form, FormGroup, Input, Button, Label, Row, Col, Alert } from 'reactstrap';
import catalog from '../assets/catalogo.csv'
import concepts from '../assets/conceptos.xlsx'
import XLSX from 'xlsx';

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
      ejercicio: 2019,
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
      bae: [],
      dias_pagados: 0,
      catalogo: [],
      hasError: true
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
    this.fileName = /^(20\d{2})([012]\d)?_(retro|agui|[a-z]{3})?.*(base|conf|compen|edd|hon|b|c|h).*\.xls(x)?/i;

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
        'CURP'
      ],
      'plantilla': [
        'CODIGO',
        'FECHAING',
        'BASECONF',
        'NOEMPEADO',
        'NOMBRE_PUESTO',
        'CORREO'
        // campos que talvez no sean necesarios
        // 'NSS',
        // 'NCUENTA',
        // 'IDPAGO'
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
        descripcion = 'PAGO DEL MES DE ' + this.meses[valores.quincena] + ' DE ' + valores.ejercicio + ' ' + valores.prefijo;
        // se calculan las fechas
        fi = new Date(anio, arrayMeses.indexOf(valores.quincena), 1);
        ff = new Date(anio, arrayMeses.indexOf(valores.quincena)+1, 0);
        valores.dias_pagados = this.calculaDias(fi, ff);
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
        valores.dias_pagados = mes === 1 ? this.calculaDias(fi, ff) : 15;
        var nombre_mes = arrayMeses[mes];
        descripcion = 'PAGO DE LA ' + (segunda ?'SEGUNDA' : 'PRIMERA') + ' QUINCENA DEL MES DE '+ this.meses[nombre_mes] + ' DE ' + valores.ejercicio + ' ' + valores.prefijo;
        break;
      default:
       descripcion = '';
       valores.qna ='00';
       valores.dias_pagados = 1; // lo minimo permitodo en el reporte es 1 dia
    }
    valores.fechaInicio = fi.toISOString().substr(0, 10);
    valores.fechaFin = ff.toISOString().substr(0, 10);
    valores.fechaPago= ff.toISOString().substr(0, 10);
    return descripcion;
  }

  handleFiles(event) {
    var file = event.target.files[0];
    var coincidencias = this.fileName.exec(file.name);
    console.log(coincidencias);
    var valores = {
      quincena: '01',
      ejercicio: 2019,
      tipo_nomina: 1,
      periodo: 0,
      qna:0, // prefijo del periodo que se utlizará en la nomina
      envio: 0,
      descripcion: '',
      fechaInicio: '',
      fechaFin: '',
      fechaPago: '',
      plantilla: false,
      message: '',
      bae: {},
      dias_pagados: 1
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
          case 'B':
            valores.tipo_nomina = 1;
            valores.plantilla = true;
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
          case 'HON':
          case 'H':
            valores.tipo_nomina = 4;
            break;
          default:
            valores.tipo_nomina = 5;
        }
      }
      //tipo de emision
      if (coincidencias[3]) {
        // periodos no quincenales
        switch (coincidencias[3].toUpperCase()) {
          case 'EXTRA':
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
            }
            // se sobreescriben la fecha de inicio
            valores.fechaInicio = new Date(valores.ejercicio, 0, 1).toISOString().substr(0, 10);
            valores.fechaPago = fechaP;
            valores.descripcion = "PAGO DE " + periodo + " " + valores.prefijo;
            valores.dias_pagados = 1;

            break;
          default:
            //mensual
            valores.quincena = coincidencias[3].toUpperCase()
            valores.periodo = 1;
            valores.descripcion = this.calculaPeriodo('m', valores);
        }
      }  else {
        // pago Quincenal
        // se debe determinar la quincena en la cual se esta aplicando el pago
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
    return (diff/(1000*60*60*24)) + 1;
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
      // hay valores requeridos para los empleados de plantilla ?
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
      // valida las columnas de los conceptos
      console.log(this.state.catalogo);
      this.state.catalogo.forEach(cat => {
        if (encabezados.includes(cat.KEY)) {
          if (cat.TIPO === 1) {
            percepciones.push(cat);
          } else {
            deducciones.push(cat);
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
      console.log('base:');
      console.log(base);

      if (!hasError) {
        // valida rfc
        hasError = validaPattern(name, base, this.RfcPatter, 'RFC');      
      }
      if (!hasError) {
        // valida curp
        hasError = validaPattern(name, base, this.CurpPatter, 'CURP');      
      }
      if (!hasError) {
        datos = datos.concat(base);
      }
    });

    if (!hasError) {
      //cuenta los registros
      this.setState({base:datos, percepciones, deducciones, message:`${datos.length } registros en el archivo de nomina. ${percepciones.length} percepciones, ${deducciones.length} deducciones. Listo para procesar.`, hasError: false, color: 'success'});
      
      
    }
  }
  handleSubmit (event) {
    // Generacion de datos generales
    const folioBase = [this.state.ejercicio, this.state.qna, this.state.periodo, this.state.tipo_nomina, this.state.envio].join("");
    let incremental = 1;
    const generales = [];
    const conceptos = [];
    const serie = 'IVE';
    // se recorre la base
    this.state.base.forEach(e => {
      let datos = [];    
      let percepciones = 0;
      let deducciones = 0;
      let folio =folioBase.concat(String(incremental++).padStart(3,'0'));

      let cont = 1;
      this.state.percepciones.forEach(p => {
        let desglose = [];
        // se valida el monto
        let valor =parseFloat(parseFloat(e[p.KEY]).toFixed(2));
        if (valor>0) {
          // se valida el monto excento
          let excento = 0;
          // linea del desglose
          desglose.push(folio);
          desglose.push(String(cont++));
          desglose.push(String(p.TIPO));
          desglose.push(String(p.CLAVE));
          desglose.push(p.DESCRIPCION);
          desglose.push(String(p.TIPO_SAT));
          desglose.push(valor);
          desglose.push(excento);
          percepciones += Math.round(valor*100)/100;
          conceptos.push(desglose);
        } 
      });

      this.state.deducciones.forEach(p => {
        let desglose = [];
        // se valida el monto
        let valor = parseFloat(parseFloat(e[p.KEY]).toFixed(2));
        if (valor>0) {
          // se valida el monto excento
          let excento = 0;
          // linea del desglose
          desglose.push(folio);
          desglose.push(String(cont++));
          desglose.push(String(p.TIPO));
          desglose.push(String(p.CLAVE));
          desglose.push(p.DESCRIPCION);
          desglose.push(String(p.TIPO_SAT));
          desglose.push(valor);
          desglose.push(excento);
          deducciones += Math.round(valor*100)/100;
          conceptos.push(desglose);
        } 
      });      

      let tpercep = e['TPERCEP'];
      let tdeduc = e['TDEDUC'];

      if (Math.round(tpercep - percepciones)>0) {
        console.log('Diferencias percepciones');
      }
      if (Math.round(tdeduc - deducciones)>0) {
        console.log('Diferencias deducciones');
      }

      datos.push(folio);
      datos.push(serie);
      percepciones = Math.round(percepciones*100)/100;
      deducciones = Math.round(deducciones*100)/100;
      datos.push(percepciones);
      datos.push(deducciones);
      let neto = Math.round((percepciones-deducciones)*100)/100;
      datos.push(neto);
      datos.push('91030') // expedicion
      datos.push(e['RFC']);
      datos.push(e['NOMBRE']);
      datos.push(neto); // v. unitario
      datos.push(neto); // importe
      datos.push(neto); // tipo nomina
      datos.push(neto); // f pago
      datos.push(neto); // f inicio
      datos.push(neto); // f fin
      datos.push(neto); // dias pagados
      datos.push(percepciones);
      datos.push(deducciones);
      datos.push(neto); // otros pagos
      datos.push(neto); // patronal
      datos.push('IF'); // origen del recurso
      datos.push(0); // Rec propio
      datos.push(e['CURP']);
      datos.push('0000000000'); // Num seguro
      datos.push('01'); // Jornada
      datos.push('01'); // regimen
      datos.push(''); // Jornada
      datos.push(e['ADSCRIPCION']); // Jornada
      //datos.push() // relacion lab


      generales.push(datos);
      //conceptos.push();
    });

    // se escribe el archivo de los conceptos
    var req = new XMLHttpRequest();
    req.open("GET", concepts, true);
    req.responseType = "arraybuffer";
    req.onload = function(e) {
      var data = new Uint8Array(req.response);
      var workbook = XLSX.read(data, {type:"array", codepage:1251});
      var sh = workbook.Sheets[workbook.SheetNames[0]]
      // sh.addRows(conceptos)
      return XLSX.writeFile(workbook,'test.xlsx')
    }
    req.send();
    console.log(generales);

    
    
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
              <Input name="tipo_nomina" type="select" value={this.state.tipo_nomina} onChange={this.handleChange} disabled>
                <option value="1">Base</option>
                <option value="2">Confianza</option>
                <option value="3">EDD</option>
                <option value="4">Honorarios</option>
                <option value="5">Otro</option>
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
              <Input id="quincena" name="quincena" placeholder="01-24" value={this.state.quincena} onChange={this.handleChange}/>
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
              <Input id="fechaPago" name="fechaPago" type="number" value={this.state.dias_pagados} onChange={this.handleChange}/>
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
