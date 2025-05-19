import React from 'react';
import Button from 'muicss/lib/react/button';

export default class AppBar extends React.Component {
  render() {
    return <div>
      <div className="mui-appbar">
        <div className="left">
          {/* <div className="back"><a href="http://hashcashconsultants.com/">&laquo; Hashcash Consultants</a></div> */}
          <div className="logo">
           {/*  <a className="navbar-brand waves-effect waves-light" target="_blank" href="http://hashcashconsultants.com/">
              <img src='https://www.hashcashconsultants.com/wp-content/themes/hashcashconsultants/img/hashcash-logo.png' height="40" alt="HashCash Logo"/>
            </a> */}
          </div>
          <div className="mui--text-headline">WBB Dashboard</div>
        </div>
        <div className="icons">
          <div className="icon">
            <a href="https://github.com/WorldBlockChain/dashboard" target="_blank">
              <i className="material-icons">code</i><br />
              GitHub
            </a>
          </div>
          {
            this.props.forceTheme
              ?
              <div className="icon">
                <a href="#" onClick={this.props.turnOffForceTheme}>
                  <i className="material-icons">star_border</i><br />
                Turn off the Force theme
              </a>
              </div>
              :
              null
          }
        </div>
      </div>
    </div>
  }
}
