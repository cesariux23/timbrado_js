import React, { Component } from 'react';
import { Form, FormGroup, Input, Label, Row, Col } from 'reactstrap';
class Timbrado extends Component {
  constructor(props) {
    super(props);
    this.state = {
      envio: 0,
      tipo_nomina: 0
    };
    this.handleChange = this.handleChange.bind(this);
    //this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  handleFiles(event) {
    console.log(event.target)
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
                <option value="3">Compensaciones</option>
                <option value="4">Honorarios</option>
                <option value="5">Otro</option>
              </Input>
            </FormGroup>
          </Col>
          <Col sm={3}>
            <FormGroup>
              <Label for="emision">Tipo de emisión</Label>
              <Input name="emision" type="select">
                <option value="0">Ordinaria</option>
                <option value="1">Complementaria</option>
                <option value="2">Extraordinaria</option>
                <option value="3">Pago retroactivo</option>
                <option value="4">Aginaldo</option>
                <option value="5">Otro</option>
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
              <Input id="ejercicio" name="ejercicio" placeholder={'Año'}/>
            </FormGroup>
          </Col>
          <Col sm={2}>
            <FormGroup>
              <Label for="quincena">Quincena</Label>
              <Input id="quincena" name="quincena" placeholder="01-24"/>
            </FormGroup>
          </Col>
          <Col>
            <FormGroup>
              <Label for="descripcion">Descripción de la nomina</Label>
              <Input id="descripcion" name="descripcion"/>
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
