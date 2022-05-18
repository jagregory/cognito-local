import {
  buildClient,
  CommitmentPolicy,
  KmsKeyringNode,
} from "@aws-crypto/client-node";
import { KMS } from "aws-sdk";
import { Context } from "./context";

export interface KMSConfig {
  KMSKeyId?: string;
  KMSKeyAlias?: string;
}

const { encrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT);

export class CryptoService {
  _keyringNode?: KmsKeyringNode;
  config?: KMSConfig & AWS.KMS.ClientConfiguration;

  constructor(config?: KMSConfig) {
    this.config = config;
  }

  get keyringNode(): KmsKeyringNode {
    if (this._keyringNode) {
      return this._keyringNode;
    }

    if (!this.config || !this.config.KMSKeyAlias || !this.config.KMSKeyId) {
      throw new Error(
        "KMSConfig.KMSKeyAlias and KMSConfig.KMSKeyId is required when using a CustomEmailSender trigger."
      );
    }

    const { KMSKeyId, KMSKeyAlias, ...clientConfig } = this.config;

    const generatorKeyId = KMSKeyAlias;
    const keyIds = [KMSKeyId];

    return (this._keyringNode = new KmsKeyringNode({
      generatorKeyId,
      keyIds,
      clientProvider: () => new KMS(clientConfig),
    }));
  }

  async encrypt(ctx: Context, plaintext: string): Promise<string> {
    ctx.logger.debug({ plaintext }, "encrypting code");

    const { result } = await encrypt(this.keyringNode, plaintext);

    const encryptedCode = result.toString("base64");

    ctx.logger.debug({ encryptedCode }, "code succesfully encrypted");

    return encryptedCode;
  }
}
