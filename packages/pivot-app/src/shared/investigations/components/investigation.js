import EventTable from './event-table';
import {
    Alert,
    Glyphicon,
    Tab,
    Tabs,
    MenuItem,
    Navbar,
    NavItem,
    NavDropdown,
    Nav
} from 'react-bootstrap';
import { PivotTable } from 'pivot-shared/pivots';
import styles from 'pivot-shared/styles.less';

export default function Investigation({
    id, status, name, user, pivots = [], templates, investigations, eventTable,
    searchPivot, insertPivot, splicePivot, dismissAlert,
    graphInvestigation, saveInvestigation, togglePivots, createInvestigation,
    copyInvestigation, selectInvestigation
}) {
    return (
        <div className={styles.pivots}>
            { status && !status.ok ?
                <Alert bsStyle={status.msgStyle || 'danger'} className={styles.alert} onDismiss={dismissAlert}>
                    <strong> {status.message} </strong>
                </Alert>
                : null
            }
            {/*<Navbar inverse>*/}
            {/*<span>
                <nav
                <DropdownButton bsSize="medium" title="My Investigation" id="dropdown-size-large">
                    <MenuItem eventKey="1">Botnet</MenuItem>
                </DropdownButton>
            </span>*/}
            <div className={styles.testwrap}>
                <Navbar inverse fixedTop fluid>
                    <Navbar.Header>
                        <Navbar.Brand>
                            <a href="#"> { name } </a>
                        </Navbar.Brand>
                    </Navbar.Header>
                    <Nav pullRight>
                        <NavItem eventKey={4} onSelect={() => createInvestigation(user.id)}> 
                            <Glyphicon glyph="plus" /> 
                        </NavItem>
                        <NavItem eventKey={5} onSelect={() => copyInvestigation(id)}> 
                            <Glyphicon glyph="duplicate" /> 
                        </NavItem>
                        <NavItem eventKey={6} onSelect={() => saveInvestigation(id)}> 
                            <Glyphicon glyph="floppy-disk" /> 
                        </NavItem>
                        <NavDropdown eventKey={3} title="Open" id="basic-nav-dropdown">
                            { 
                                investigations.map((investigation) => (
                                    <MenuItem 
                                        key={investigation.id}
                                        eventKey={investigation.id} 
                                        onSelect={(eventKey) => selectInvestigation(eventKey)}
                                    > 
                                        { investigation.name } 
                                    </MenuItem>)
                                ) 
                            }
                        </NavDropdown>
                    </Nav>
                </Navbar>
            </div>
            <Tabs defaultActiveKey={1} id="investigation-bottom-tabbar" className={styles.investigationTabs}>
                <Tab eventKey={1} title="Pivots">
                    <PivotTable id={id}
                                pivots={pivots}
                                status={status}
                                templates={templates}
                                insertPivot={insertPivot}
                                splicePivot={splicePivot}
                                searchPivot={searchPivot}
                                dismissAlert={dismissAlert}
                                togglePivots={togglePivots}
                                saveInvestigation={saveInvestigation}
                                graphInvestigation={graphInvestigation}
                                />
                </Tab>
                <Tab eventKey={2} title="Events">
                    { eventTable &&
                        <EventTable { ...eventTable }/>
                        || undefined
                    }
                </Tab>
            </Tabs>
        </div>
    );
}
