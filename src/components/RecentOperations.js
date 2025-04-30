import React from 'react';
import Panel from 'muicss/lib/react/panel';
import axios from 'axios';
import moment from 'moment';
import clone from 'lodash/clone';
import each from 'lodash/each';
import defaults from 'lodash/defaults';
import AccountBadge from './AccountBadge';
import AssetLink from './AssetLink';
import BigNumber from 'bignumber.js';

export default class RecentOperations extends React.Component {
  constructor(props) {
    super(props);
    this.props = defaults(props, {limit: 10});
    this.state = {loading: true, operations: []};

    this.url = `${this.props.horizonURL}/operations`;
    if (this.props.account) {
      this.url = `${this.props.horizonURL}/accounts/${this.props.account}/operations`;
    }
    this.url = `${this.url}?order=desc&limit=${this.props.limit}`;
  }

  onNewOperation(operation) {
    if (this.props.account) {
      if (this.props.account !== operation.source_account &&
        // payment/path_payment
        this.props.account !== operation.to &&
        // change_trust/allow_trust
        this.props.account !== operation.trustee) {
        return;
      }
    }
    let operations = clone(this.state.operations);
    operation.createdAtMoment = moment(); // now
    operations.unshift(operation);
    operations.pop();
    this.setState({operations});
  }

  getRecentOperations() {
    axios.get(this.url)
      .then(response => {
        let records = response.data._embedded.records;
        let operations = this.state.operations;
        each(records, operation => {
          if (!this.pagingToken) {
            this.pagingToken = operation.paging_token;
          }
          this.state.operations.push(operation);
        })
        this.setState({operations});
        for (let i = 0; i < operations.length; i++) {
          this.getTransactionTime(operations[i]);
        }
        // Start listening to events
        this.props.emitter.addListener(this.props.newOperationEventName, this.onNewOperation.bind(this))
      });
  }

  getTransactionTime(op) {
    axios.get(op._links.transaction.href)
      .then(tx => {
        let operations = clone(this.state.operations);
        for (let i = 0; i < operations.length; i++) {
          if (operations[i].id == op.id) {
            operations[i].createdAtMoment = moment(tx.data.created_at);
            operations[i].ago = this.ago(operations[i].createdAtMoment);
            break;
          }
        }
        this.setState({operations});
      });
  }

  updateAgo() {
    let operations = clone(this.state.operations);
    let updateState = false;
    for (let i = 0; i < operations.length; i++) {
      if (operations[i].createdAtMoment) {
        let newVal = this.ago(operations[i].createdAtMoment);
        if (operations[i].ago != newVal) {
          operations[i].ago = newVal;
          updateState = true;
        }
      }
    }
    if (updateState) {
      this.setState({operations});
    }
  }

  ago(a) {
    let diff = moment().diff(a, 'seconds');
    if (diff < 60) {
      return `${diff}s`;
    } else if (diff < 60*60) {
      diff = moment().diff(a, 'minutes');
      return `${diff}m`;
    } else if (diff < 24*60*60) {
      diff = moment().diff(a, 'hours');
      return `${diff}h`;
    } else {
      diff = moment().diff(a, 'days');
      return `${diff}d`;
    }
  }

  componentDidMount() {
    // Update seconds ago
    this.timerID = setInterval(() => this.updateAgo(), 10*1000);
    this.getRecentOperations();
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  amount(am, asset_type, asset_code, asset_issuer) {
    // Strip zeros and `.`
    let amount = new BigNumber(am).toFormat(7).replace(/\.*0+$/, '');
    let code;
    if (asset_type == "native") {
      code = <i>WBB</i>
    } else {
      code = asset_code;
    }

    return <span>
      {amount} <AssetLink horizonURL={this.props.horizonURL} code={code} issuer={asset_issuer} />
    </span>
  }

  operationTypeColRender(op) {
    switch (op.type) {
      case 'create_account':
        return <span className="detailshcx">
          {this.amount(op.starting_balance, "native")} &raquo; <AccountBadge horizonURL={this.props.horizonURL} id={op.account} known={this.props.account} />
        </span>;
      case 'payment':
        return <span className="detailshcx">
          {this.amount(op.amount, op.asset_type, op.asset_code, op.asset_issuer)} &raquo; <AccountBadge horizonURL={this.props.horizonURL} id={op.to} known={this.props.account} />
        </span>;
      case 'path_payment':
        return <span className="detailshcx">
          max {this.amount(op.source_max, op.source_asset_type, op.source_asset_code, op.source_asset_issuer)} &raquo; {this.amount(op.amount, op.asset_type, op.asset_code, op.asset_issuer)} &raquo; <AccountBadge horizonURL={this.props.horizonURL} id={op.to} known={this.props.account} />
        </span>;
      case 'change_trust':
        return <span className="detailshcx">
          <AssetLink horizonURL={this.props.horizonURL} code={op.asset_code} issuer={op.asset_issuer} /> issued by <AccountBadge horizonURL={this.props.horizonURL} id={op.asset_issuer} known={this.props.account} />
        </span>;
      case 'allow_trust':
        return <span className="detailshcx">
          {op.authorize ? "Allowed" : "Disallowed"} <AccountBadge horizonURL={this.props.horizonURL} id={op.trustor} known={this.props.account} /> to hold <AssetLink horizonURL={this.props.horizonURL} code={op.asset_code} issuer={op.asset_issuer} />
        </span>;
      case 'manage_offer':
      case 'create_passive_offer':
        let action;

        if (op.amount == 0) {
          action = "Remove offer:"
        } else if (op.offer_id != 0) {
          action = "Update offer: sell"
        } else {
          action = "Sell"
        }

        return <span className="detailshcx">
          {action} {this.amount(op.amount, op.selling_asset_type, op.selling_asset_code, op.selling_asset_issuer)} for {op.buying_asset_type == "native" ? <i>WBB</i> : <AssetLink horizonURL={this.props.horizonURL} code={op.buying_asset_code} issuer={op.buying_asset_issuer} />}
        </span>;
      case 'account_merge':
        return <span className="detailshcx">&raquo; <AccountBadge horizonURL={this.props.horizonURL} id={op.into} /></span>
      case 'manage_data':
        return <span className="detailshcx">Key: <code>{op.name.length <= 20 ? op.name : op.name.substr(0, 20)+'...'}</code></span>
    }
  }

  render() {
    return (
      <Panel>
{/*        <div className="widget-name">
          Recent operations: {this.props.label} {this.props.account ? this.props.account.substr(0, 4) : ''}
          <a href={this.url} target="_blank" className="api-link">API</a>
        </div>*/}
        <div className="mui-table small abc">
        {/* <thead> */}
        
          <div className="detailsledger row header-part">
            <div className="col-md-3">Source</div>
            <div className="col-md-3">Operation</div>
            <div className="col-md-3 detailsldgr">Details</div>
            <div className="col-md-3">Time ago</div>
          </div>
        {/* </thead> */}
        {/* <tbody> */}
          {
            this.state.operations.map(op => {
              return <div className="detailsledger row" key={op.id}>
                <div className="col-md-3"><AccountBadge horizonURL={this.props.horizonURL} id={op.source_account} known={this.props.account} /></div>
                <div className="col-md-3"><a href={op._links.self.href} target="_blank">{op.type == 'create_passive_offer' ? 'passive_offer' : op.type}</a></div>
                <div className="xyz col-md-3"><span className="text-justify">{this.operationTypeColRender(op)}</span></div>
                <div className="abc col-md-3">{op.ago ? <span  title={op.createdAtMoment.format()}>{op.ago}</span> : '...'}</div>
              </div>
            })
          }
        {/* </tbody> */}
      </div>
      </Panel>
    );
  }
}
