import React, { Component } from 'react';
import { Form, FormGroup, Input, Label, Row, Col, Alert } from 'reactstrap';
import XLSX from 'xlsx';

// components
const ShowDetails = function (props) {
  // return render () => {
  //   if (props.show) {
    if (props.message) {
      return <Alert color={props.color || "warning"}>{props.message}</Alert>
    } else {
      return <Alert color="primary">Seleccione un archivo</Alert>
    }
  //     else {
  //       return <Alert color="primary"> seleccione un archivo</Alert>;
  //     }
  //   }
  // }
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
      descripcion: '',
      fechaInicio: '',
      fechaFin: '',
      fechaPago: '',
      plantilla: false,
      color: "primary",
      message: '',
      bae: {}
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleFiles = this.handleFiles.bind(this);
    this.calculaPeriodo = this.calculaPeriodo.bind(this);
    this.loadFile = this.loadFile.bind(this);
    //this.handleSubmit = this.handleSubmit.bind(this);

    // Patrón para validar el nombre del archivo
    this.fileName = /^(20\d{2})([012]\d)?_(retro|agui|[a-z]{3})?.*(base|conf|compen|edd|hon|b|c|h).*\.xls(x)?/i;
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
    this.dataFields = [
      'RFC',
      'CURP',
      'ADSCRIPCION',
      'NOMBRE',
      'TPERCEP',
      'TDEDUC',
      'TNETO',
      // campos que talvez no sean necesarios
      // 'CODIGO',
      // 'NSS',
      // 'NCUENTA',
      // 'IDPAGO',
      // 'NOEMPEADO',
      // 'NOMBRE_PUESTO',
      // 'CORREO',
    ];
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
        break;
      case 'q':
        var segunda = valores.quincena % 2 === 0;
        var mes = ((segunda ? parseInt(valores.quincena) : parseInt(valores.quincena) + 1) / 2) - 1;
        // se calculan las fechas
        fi = new Date(anio, mes, 1);
        ff = new Date(anio, mes, 15);
        if (segunda) {
          fi = new Date(anio, mes, 16);
          ff = new Date(anio, mes + 1, 0);
        }
        var nombre_mes = arrayMeses[mes];
        descripcion = 'PAGO DE LA ' + (segunda ?'SEGUNDA' : 'PRIMERA') + ' QUINCENA DEL MES DE '+ this.meses[nombre_mes] + ' DE ' + valores.ejercicio + ' ' + valores.prefijo;
        break;
      default:
       descripcion = '';
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
      ejercicio: 2019,
      quincena: '01',
      tipo_nomina: 1,
      periodo: 0,
      envio: 0,
      descripcion: '',
      fechaInicio: '',
      fechaFin: '',
      fechaPago: '',
      plantilla: false,
      message: '',
      bae: {}
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

  loadFile (event) {
    var data = event.target.result;
    var color = "danger";
    let wb = XLSX.read(data, {type: 'binary'});
    let names = wb.SheetNames;
    let base = XLSX.utils.sheet_to_json(wb.Sheets[names[0]]);
    let encabezados = Object.keys(base[0]);
    console.log(encabezados);
    const faltantes = [];
    this.dataFields.forEach(item => {
      if(encabezados.indexOf(item) < 0) {
        faltantes.push(item);
        console.log('esta: '+ item);
      }
    })
    if (faltantes.length) {
      this.setState({message: `No existen en el archivo las columnas: ${faltantes.join(', ')}`, color});
    }
    console.log(base);
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
              <Input name="emision" type="select" value={this.state.periodo} onChange={this.handleChange}>
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
        </Row>
        <ShowDetails message={this.state.message} color={this.state.color}></ShowDetails>
      </Form>
    );
  }
}

export default Timbrado;
