/*
 * Copyright (C) 2015 Actor LLC. <https://actor.im>
 */

import { assign } from 'lodash';
import React from 'react';
import ReactMixin from 'react-mixin';
import { IntlMixin, FormattedMessage } from 'react-intl';
import classnames from 'classnames';
import { lightbox } from '../../utils/ImageUtils';

import ActorClient from '../../utils/ActorClient';
import confirm from '../../utils/confirm'
import { escapeWithEmoji } from '../../utils/EmojiUtils'

import DialogActionCreators from '../../actions/DialogActionCreators';
import GroupProfileActionCreators from '../../actions/GroupProfileActionCreators';
import InviteUserActions from '../../actions/InviteUserActions';
import EditGroupActionCreators from '../../actions/EditGroupActionCreators';

import PeerStore from '../../stores/PeerStore';
import DialogStore from '../../stores/DialogStore';
import GroupStore from '../../stores/GroupStore';
import UserStore from '../../stores/UserStore';

import AvatarItem from '../../components/common/AvatarItem.react';
import InviteUser from '../../components/modals/InviteUser.react';
import InviteByLink from '../../components/modals/invite-user/InviteByLink.react';
import GroupProfileMembers from '../../components/activity/GroupProfileMembers.react';
import Fold from '../../components/common/Fold.React';
import EditGroup from '../../components/modals/EditGroup.react';

const getStateFromStores = (groupId) => {
  const thisPeer = PeerStore.getGroupPeer(groupId);
  return {
    thisPeer: thisPeer,
    isNotificationsEnabled: DialogStore.isNotificationsEnabled(thisPeer),
    integrationToken: GroupStore.getIntegrationToken()
  };
};

let _prevGroupId;

class GroupProfile extends React.Component {
  static propTypes = {
    group: React.PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);
    const myId = UserStore.getMyId();

    this.state = assign({
      isMoreDropdownOpen: false
    }, getStateFromStores(props.group.id));

    if (props.group.members.length > 0 && myId === props.group.adminId) {
      GroupProfileActionCreators.getIntegrationToken(props.group.id);
    }

    DialogStore.addNotificationsListener(this.onChange);
    GroupStore.addListener(this.onChange);
  }

  componentWillUnmount() {
    DialogStore.removeNotificationsListener(this.onChange);
  }

  componentWillReceiveProps(newProps) {
    const myId = UserStore.getMyId();
    // FIXME!!!
    setTimeout(() => {
      this.setState(getStateFromStores(newProps.group.id));
      if (newProps.group.id !== _prevGroupId && newProps.group.members.length > 0 && myId === newProps.group.adminId) {
        GroupProfileActionCreators.getIntegrationToken(newProps.group.id);
        _prevGroupId = newProps.group.id;
      }
    }, 0);
  }

  onAddMemberClick = group => InviteUserActions.show(group);

  onLeaveGroupClick = gid => {
    confirm(this.getIntlMessage('modal.confirm.leave'), {
      abortLabel: this.getIntlMessage('button.cancel'),
      confirmLabel: this.getIntlMessage('button.ok')
    }).then(
      () => DialogActionCreators.leaveGroup(gid),
      () => {}
    );
  };

  onNotificationChange = event => {
    const { thisPeer } = this.state;
    DialogActionCreators.changeNotificationsEnabled(thisPeer, event.target.checked);
  };

  onChange = () => this.setState(getStateFromStores(this.props.group.id));
  selectToken = (event) => event.target.select();

  toggleMoreDropdown = () => {
    const { isMoreDropdownOpen } = this.state;

    if (!isMoreDropdownOpen) {
      this.setState({isMoreDropdownOpen: true});
      document.addEventListener('click', this.closeMoreDropdown, false);
    } else {
      this.closeMoreDropdown();
    }
  };

  closeMoreDropdown = () => {
    this.setState({isMoreDropdownOpen: false});
    document.removeEventListener('click', this.closeMoreDropdown, false);
  };

  onClearGroupClick = (gid) => {
    confirm(this.getIntlMessage('modal.confirm.clear'), {
      abortLabel: this.getIntlMessage('button.cancel'),
      confirmLabel: this.getIntlMessage('button.ok')
    }).then(
      () => {
        const peer = ActorClient.getGroupPeer(gid);
        DialogActionCreators.clearChat(peer)
      },
      () => {}
    );
  };

  onDeleteGroupClick = (gid) => {
    confirm(this.getIntlMessage('modal.confirm.delete'), {
      abortLabel: this.getIntlMessage('button.cancel'),
      confirmLabel: this.getIntlMessage('button.ok')
    }).then(
      () => {
        const peer = ActorClient.getGroupPeer(gid);
        DialogActionCreators.deleteChat(peer);
      },
      () => {}
    );
  };

  onEditGroupClick = (gid) => EditGroupActionCreators.show(gid);

  handleAvatarClick= () => lightbox.open(this.props.group.bigAvatar);

  render() {
    const { group } = this.props;
    const {
      isNotificationsEnabled,
      integrationToken,
      isMoreDropdownOpen
    } = this.state;

    const myId = UserStore.getMyId();
    const admin = UserStore.getUser(group.adminId);
    const isMember = DialogStore.isGroupMember(group);

    let adminControls;
    if (group.adminId === myId) {
      adminControls = [
        <li className="dropdown__menu__item hide">
          <i className="material-icons">photo_camera</i>
          {this.getIntlMessage('setGroupPhoto')}
        </li>
      ,
        <li className="dropdown__menu__item hide">
          <svg className="icon icon--dropdown"
               dangerouslySetInnerHTML={{__html: '<use xlink:href="assets/images/icons.svg#integration"/>'}}/>
          {this.getIntlMessage('addIntegration')}
        </li>
      ,
        <li className="dropdown__menu__item" onClick={() => this.onEditGroupClick(group.id)}>
          <i className="material-icons">mode_edit</i>
          {this.getIntlMessage('editGroup')}
        </li>
      ];
    }

    const members = <FormattedMessage message={this.getIntlMessage('members')} numMembers={group.members.length}/>;

    const dropdownClassNames = classnames('dropdown', {
      'dropdown--opened': isMoreDropdownOpen
    });

    const iconElement = (
      <svg className="icon icon--green"
           dangerouslySetInnerHTML={{__html: '<use xlink:href="assets/images/icons.svg#members"/>'}}/>
    );

    const groupMeta = [
      <header>
        <AvatarItem image={group.bigAvatar}
                    placeholder={group.placeholder}
                    size="large"
                    title={group.name}
                    onClick={this.handleAvatarClick}/>

        <h3 className="group_profile__meta__title" dangerouslySetInnerHTML={{__html: escapeWithEmoji(group.name)}}/>
        <div className="group_profile__meta__created">
          {this.getIntlMessage('createdBy')}
          &nbsp;
          <span dangerouslySetInnerHTML={{__html: escapeWithEmoji(admin.name)}}/>
        </div>
      </header>
    ,
      group.about ? (
        <div className="group_profile__meta__description"
             dangerouslySetInnerHTML={{__html: escapeWithEmoji(group.about).replace(/\n/g, '<br/>')}}/>
      ) : null
    ];

    const token = (group.adminId === myId) ? (
      <li className="profile__list__item group_profile__integration no-p">
        <Fold icon="power" iconClassName="icon--pink" title={this.getIntlMessage('integrationToken')}>
          <div className="info info--light">
            <p>{this.getIntlMessage('integrationTokenHint')}</p>
            <a href="https://actor.readme.io/docs/simple-integration" target="_blank">{this.getIntlMessage('integrationTokenHelp')}</a>
          </div>
          <textarea className="token" onClick={this.selectToken} readOnly row="3" value={integrationToken}/>
        </Fold>
      </li>
    ) : null;

    if (isMember) {
      return (
        <div className="activity__body group_profile">
          <ul className="profile__list">
            <li className="profile__list__item group_profile__meta">
              {groupMeta}
              <footer className="row">
                <div className="col-xs">
                  <button className="button button--flat button--wide"
                          onClick={() => this.onAddMemberClick(group)}>
                    <i className="material-icons">person_add</i>
                    {this.getIntlMessage('addPeople')}
                  </button>
                </div>
                <div style={{width: 10}}/>
                <div className="col-xs">
                  <div className={dropdownClassNames}>
                    <button className="dropdown__button button button--flat button--wide"
                            onClick={this.toggleMoreDropdown}>
                      <i className="material-icons">more_horiz</i>
                      {this.getIntlMessage('more')}
                    </button>
                    <ul className="dropdown__menu dropdown__menu--right">
                      {adminControls}
                      <li className="dropdown__menu__item"
                          onClick={() => this.onLeaveGroupClick(group.id)}>
                        {this.getIntlMessage('leaveGroup')}
                      </li>
                      <li className="dropdown__menu__item"
                          onClick={() => this.onClearGroupClick(group.id)}>
                        {this.getIntlMessage('clearGroup')}
                      </li>
                      <li className="dropdown__menu__item"
                          onClick={() => this.onDeleteGroupClick(group.id)}>
                        {this.getIntlMessage('deleteGroup')}
                      </li>
                    </ul>
                  </div>
                </div>
              </footer>
            </li>

            <li className="profile__list__item group_profile__media no-p hide">
              <Fold icon="attach_file" iconClassName="icon--gray" title={this.getIntlMessage('sharedMedia')}>
                <ul>
                  <li><a>230 Shared Photos and Videos</a></li>
                  <li><a>49 Shared Links</a></li>
                  <li><a>49 Shared Files</a></li>
                </ul>
              </Fold>
            </li>

            <li className="profile__list__item group_profile__notifications no-p">
              <label htmlFor="notifications">
                <i className="material-icons icon icon--squash">notifications_none</i>
                {this.getIntlMessage('notifications')}

                <div className="switch pull-right">
                  <input checked={isNotificationsEnabled}
                         id="notifications"
                         onChange={this.onNotificationChange}
                         type="checkbox"/>
                  <label htmlFor="notifications"></label>
                </div>
              </label>
            </li>

            <li className="profile__list__item group_profile__members no-p">
              <Fold iconElement={iconElement}
                    title={members}>
                <GroupProfileMembers groupId={group.id} members={group.members}/>
              </Fold>
            </li>

            {token}
          </ul>

          <InviteUser/>
          <InviteByLink/>
          <EditGroup/>
        </div>
      );
    } else {
      return (
        <div className="activity__body group_profile">
          <ul className="profile__list">
            <li className="profile__list__item group_profile__meta">
              {groupMeta}
            </li>
          </ul>
        </div>
      );
    }

  }
}

ReactMixin.onClass(GroupProfile, IntlMixin);

export default GroupProfile;
