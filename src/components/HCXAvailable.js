import React from 'react';
import AmountWidget from './AmountWidget';
import Panel from 'muicss/lib/react/panel';
import {availableCoins} from '../../common/lumens.js';

export default class HCXAvailable extends AmountWidget {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.timerID = setInterval(
      () => this.updateAmount(),
      60*60*1000
    );
    this.updateAmount();
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  updateAmount() {
    availableCoins().then(amount => {
      this.setState({amount, code: "WBB", loading: false});
    });
  }

  renderName() {
    return <div>
      <span>WBB Available (not held by HC)</span>
      <a href="/api/lumens" target="_blank" className="api-link">API</a>
    </div>
  }
}
