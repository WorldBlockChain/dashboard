import React from 'react';
import AmountWidget from './AmountWidget';
import Panel from 'muicss/lib/react/panel';
import axios from 'axios';
import {totalCoins} from '../../common/lumens.js';

export default class HcxTotalSupply extends AmountWidget {
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
    totalCoins(this.props.horizonURL)
      .then(amount => {
        let code = "WBB";
        this.setState({amount, code, loading: false});
      });
  }

  renderName() {
    return <div className="hcxscan-dshboard">
      <span>Total Supply</span>
{/*      <a href={`${this.props.horizonURL}/ledgers/?order=desc&limit=1`} target="_blank" className="api-link">API</a>*/}
    </div>
  }
}
