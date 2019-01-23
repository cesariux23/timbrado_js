import React, { Component } from 'react';
import './App.css';
import { Navbar, NavbarBrand, Container } from 'reactstrap';
import Timbrado from './Timbrado/Timbrado.js';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Navbar color="light" light expand="md">
          <NavbarBrand href="/">Generador de layouts</NavbarBrand>
        </Navbar>
        <Container>
          <Timbrado></Timbrado>
        </Container>
      </div>
    );
  }
}

export default App;
