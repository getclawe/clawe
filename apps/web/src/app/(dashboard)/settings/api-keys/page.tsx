"use client";

import {
  PageHeader,
  PageHeaderRow,
  PageHeaderTitle,
} from "@dashboard/page-header";
import { ApiKeysSettings } from "./_components/api-keys-settings";

const ApiKeysSettingsPage = () => {
  return (
    <>
      <PageHeader>
        <PageHeaderRow>
          <PageHeaderTitle>API Keys</PageHeaderTitle>
        </PageHeaderRow>
      </PageHeader>

      <div className="max-w-2xl">
        <ApiKeysSettings />
      </div>
    </>
  );
};

export default ApiKeysSettingsPage;
