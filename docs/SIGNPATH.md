# Code Signing via SignPath Foundation

This document explains why PromptBox installers trigger OS security warnings, what the
[SignPath Foundation](https://signpath.org/) offers, whether PromptBox qualifies, and how to apply.

## The problem

Windows SmartScreen shows *"Windows protected your PC"* for any installer that isn't signed with a
certificate from a trusted Certificate Authority. Reputation is tracked **per file hash** for
unsigned binaries, so every new PromptBox release starts from zero — the warning never goes away on
its own for a project that releases regularly.

Self-signed certificates don't help (Windows doesn't trust them), and commercial certificates cost
€70–600/year and since 2023 must be stored on hardware tokens or cloud HSMs, which complicates our
fully automated GitHub Actions release pipeline.

## What SignPath Foundation offers

[SignPath.io](https://signpath.io/solutions/open-source-community) (the company) donates its code
signing service to qualifying open-source projects through the SignPath Foundation (the non-profit):

- **Free** Windows Authenticode signing for OSS releases.
- Private keys live on SignPath's Hardware Security Module — nothing to store in GitHub secrets,
  no USB token.
- Signing integrates with CI (GitHub Actions connector): the release workflow submits the built
  installer as a signing request, and the signed artifact comes back.
- The certificate creates a verifiable link between the published binary and this repository.
- No personal identity verification is required from the maintainer.

**Important caveats:**

- The certificate is issued to **SignPath Foundation** — they become the listed publisher of the
  binary, not "Sébastien Bourgeois". This is the trade-off for the free program.
- It covers **Windows signing only**. macOS Gatekeeper warnings require a separate Apple Developer
  membership ($99/year) and notarization; Linux AppImages don't need signing.
- Every release requires **manual approval** of the signing request in the SignPath dashboard —
  the release pipeline gains one human step.

## Does PromptBox qualify?

Requirements from the [SignPath Foundation terms](https://signpath.org/terms), checked against this
project:

| Requirement | PromptBox status |
| --- | --- |
| OSI-approved license, no dual-licensing | ✅ MIT |
| No proprietary code | ✅ Vanilla JS/HTML/CSS + Electron |
| Actively developed, with released versions | ✅ Regular releases via GitHub |
| Documented functionality | ✅ README |
| No malware / hacking tools | ✅ |
| Verifiable automated builds from source | ✅ GitHub Actions [release workflow](../.github/workflows/release.yml) builds every release from this public repo |
| Signed binaries carry product name/version metadata | ✅ `productName` and `version` from package.json are embedded by electron-builder |
| Uninstallation capability | ✅ NSIS installer registers a standard uninstaller |
| No unrequested network transfers | ✅ App is fully local (CDN fonts/icons in the UI are the only outbound requests) |

## Obligations we take on if accepted

1. **Publish a code signing policy** on the project homepage (README), including:
   - The attribution: *"Free code signing provided by SignPath.io, certificate by SignPath Foundation"*.
   - The team structure and roles: who commits, who reviews, who approves releases
     (for a solo project: the maintainer holds all roles — state this explicitly).
   - A privacy statement, e.g.: *"This program will not transfer any information to other networked
     systems unless specifically requested by the user."*
2. **Enable multi-factor authentication** on both the GitHub account and the SignPath account.
3. **Keep builds verifiable**: releases must come from the public CI pipeline; build scripts and
   workflow files get the same scrutiny as application code.
4. **Manually approve** each release's signing request in the SignPath dashboard.
5. Accept that SignPath Foundation, as certificate holder, can enforce technical constraints and
   suspend the service on violations.

## How to apply

1. Make sure MFA is enabled on the GitHub account (Settings → Password and authentication).
2. Add the code signing policy section to the README (see obligations above) — the application
   reviewer looks for it.
3. Apply at **<https://signpath.org/apply>** with:
   - Project name, homepage, and repository URL (`https://github.com/sebbourgeois/promptbox`)
   - License (MIT), description, and evidence of activity (release history)
   - The CI system used (GitHub Actions) and a link to the release workflow
4. Wait for the review. Accepted projects are listed on <https://signpath.org/projects>.

## Integration sketch (once accepted)

SignPath provides a GitHub Action
([`signpath/github-action-submit-signing-request`](https://github.com/SignPath/github-action-submit-signing-request))
that plugs into the existing release workflow after the Windows build:

```yaml
# in the windows build job, after electron-builder produces dist/*.exe
- uses: signpath/github-action-submit-signing-request@v1
  with:
    api-token: ${{ secrets.SIGNPATH_API_TOKEN }}
    organization-id: <from the SignPath dashboard>
    project-slug: promptbox
    signing-policy-slug: release-signing
    artifact-configuration-slug: nsis-installer
    github-artifact-id: <id of the uploaded unsigned artifact>
    wait-for-completion: true
    output-artifact-directory: dist-signed
```

The exact artifact configuration (which files inside the installer get signed, metadata
constraints) is set up in the SignPath dashboard during onboarding. The release job then publishes
the signed installer instead of the unsigned one.

## References

- SignPath Foundation: <https://signpath.org/> · [Terms](https://signpath.org/terms) ·
  [Accepted projects](https://signpath.org/projects) · [Apply](https://signpath.org/apply)
- SignPath OSS program: <https://signpath.io/solutions/open-source-community>
- Electron code signing guide: <https://www.electronjs.org/docs/latest/tutorial/code-signing>
