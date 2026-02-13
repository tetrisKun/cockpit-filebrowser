import React from 'react';
import { Page, PageSection } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import cockpit from 'cockpit';

const _ = cockpit.gettext;

export const Application = () => {
    return (
        <Page>
            <PageSection>
                <Card>
                    <CardTitle>{_("File Browser")}</CardTitle>
                    <CardBody>{_("Loading...")}</CardBody>
                </Card>
            </PageSection>
        </Page>
    );
};
