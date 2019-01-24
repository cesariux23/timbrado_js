import React, { Component } from 'react';
import { Form, FormGroup, Input, Label, Row, Col } from 'reactstrap';
class Timbrado extends Component {

  constructor(props) {
    super(props);
    this.state = {
      envio: 0,
      tipo_nomina: 1,
      ejercicio: 2019,
      quincena: '01',
      periodo: 0,
      descripcion: ''
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleFiles = this.handleFiles.bind(this);
    this.calculaPeriodo = this.calculaPeriodo.bind(this);
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
    switch (tipo) {
      case 'm':
        descripcion = 'PAGO DEL MES DE ' + this.meses[valores.quincena] + ' DE ' + valores.ejercicio;
        break;
      case 'q':
        var segunda = valores.quincena % 2 === 0;
        var mes = (segunda ? parseInt(valores.quincena) : parseInt(valores.quincena) + 1) / 2;
        var nombre_mes = Object.keys(this.meses)[mes-1];
        descripcion = 'PAGO DE LA ' + (segunda ?'SEGUNDA' : 'PRIMERA') + ' QUINCENA DEL MES DE '+ this.meses[nombre_mes] + ' DE ' + valores.ejercicio;
        break;
      default:
       descripcion = '';
    }
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
      descripcion: ''
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
        switch (coincidencias[4].toUpperCase()) {
          case 'BASE':
          case 'B':
            valores.tipo_nomina = 1;
            break;
            case 'CONF':
            case 'C':
              valores.tipo_nomina = 2;
              break;
            case 'COMPEN':
            case 'EDD':
              valores.tipo_nomina = 3;
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
            valores.emision = 2;
            break;
          default:
            //mensual
            valores.quincena = coincidencias[3].toUpperCase()
            valores.emision = 1;
            valores.descripcion = this.calculaPeriodo('m', valores);
        }
      }  else {
        // pago Quincenal
        // se debe determinar la quincena en la cual se esta aplicando el pago
        valores.descripcion = this.calculaPeriodo('q', valores);
      }
    } else {
      alert('el nombre de archivo no coincide con el formato establecido');
    }
    this.setState(valores);
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
              <Input id="fechaInicio" name="fechaInicio" type="date"/>
            </FormGroup>
          </Col>
          <Col>
            <FormGroup>
              <Label for="fechaFin">Fecha fin</Label>
              <Input id="fechaFin" name="fechaFin" type="date"/>
            </FormGroup>
          </Col>
          <Col>
            <FormGroup>
              <Label for="fechaPago">Fecha pago</Label>
              <Input id="fechaPago" name="fechaPago" type="date"/>
            </FormGroup>
          </Col>
        </Row>
      </Form>
    );
  }
}

export default Timbrado;
