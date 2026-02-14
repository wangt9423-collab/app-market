package helm

import (
	"context"
	"fmt"
	"os"

	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/cli"
)

type Client struct {
	settings *cli.EnvSettings
	cfg      *action.Configuration
}

// NewClient creates a new Helm client for a specific namespace.
// For now, we use the default kubeconfig (~/.kube/config) or environment.
// In a real multi-tenant system, we would inject a specific kubeconfig here.
func NewClient(namespace string) (*Client, error) {
	settings := cli.New()
	settings.SetNamespace(namespace)

	cfg := new(action.Configuration)

	// Use the generic RESTClientGetter which relies on KUBECONFIG env or default path
	// The log function is set to print to stdout for debug purposes
	if err := cfg.Init(settings.RESTClientGetter(), namespace, os.Getenv("HELM_DRIVER"), func(format string, v ...interface{}) {
		fmt.Printf(format+"\n", v...)
	}); err != nil {
		return nil, fmt.Errorf("failed to init helm config: %w", err)
	}

	return &Client{
		settings: settings,
		cfg:      cfg,
	}, nil
}

// InstallChart installs a chart from a local path or remote URL (simplified to local path for now).
func (c *Client) InstallChart(ctx context.Context, releaseName, chartPath string, values map[string]interface{}) error {
	install := action.NewInstall(c.cfg)
	install.ReleaseName = releaseName
	install.Namespace = c.settings.Namespace()
	install.CreateNamespace = true

	// Load the chart
	chartRequested, err := loader.Load(chartPath)
	if err != nil {
		return fmt.Errorf("failed to load chart: %w", err)
	}

	// Execute installation
	_, err = install.Run(chartRequested, values)
	if err != nil {
		return fmt.Errorf("helm install failed: %w", err)
	}

	return nil
}

// UninstallRelease removes a release.
func (c *Client) UninstallRelease(releaseName string) error {
	uninstall := action.NewUninstall(c.cfg)
	_, err := uninstall.Run(releaseName)
	if err != nil {
		return fmt.Errorf("helm uninstall failed: %w", err)
	}
	return nil
}
