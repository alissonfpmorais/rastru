{ pkgs ? import <nixpkgs> {
    config.allowUnfree = true;
  }
}:

with pkgs;

pkgs.mkShell {
  buildInputs = [
    nodejs_20
    nodePackages_latest.pnpm
  ];
}
