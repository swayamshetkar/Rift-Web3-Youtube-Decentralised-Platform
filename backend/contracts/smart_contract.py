from pyteal import *


def approval_program():
    fee_bps = Int(200)
    bps_denominator = Int(10000)

    token_key = Bytes("token_id")
    platform_key = Bytes("platform_wallet")
    admin_key = Bytes("admin")

    on_create = Seq(
        App.globalPut(admin_key, Txn.sender()),
        App.globalPut(
            token_key,
            If(Txn.application_args.length() >= Int(1), Btoi(Txn.application_args[0]), Int(0)),
        ),
        App.globalPut(
            platform_key,
            If(Txn.application_args.length() >= Int(2), Txn.application_args[1], Txn.sender()),
        ),
        Approve(),
    )

    is_admin = Txn.sender() == App.globalGet(admin_key)

    set_config = Seq(
        Assert(is_admin),
        Assert(Txn.application_args.length() >= Int(2)),
        App.globalPut(token_key, Btoi(Txn.application_args[1])),
        App.globalPut(
            platform_key,
            If(Txn.accounts.length() >= Int(1), Txn.accounts[1], App.globalGet(platform_key)),
        ),
        Approve(),
    )

    opt_in_asset = Seq(
        Assert(is_admin),
        Assert(Txn.assets[0] == App.globalGet(token_key)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[0],
                TxnField.asset_receiver: Global.current_application_address(),
                TxnField.asset_amount: Int(0),
            }
        ),
        InnerTxnBuilder.Submit(),
        Approve(),
    )

    deposit = Seq(
        Assert(Global.group_size() == Int(2)),
        Assert(Txn.group_index() == Int(1)),
        Assert(Gtxn[0].type_enum() == TxnType.AssetTransfer),
        Assert(Gtxn[0].sender() == Txn.sender()),
        Assert(Gtxn[0].xfer_asset() == App.globalGet(token_key)),
        Assert(Gtxn[0].asset_receiver() == Global.current_application_address()),
        Assert(Gtxn[0].asset_amount() > Int(0)),
        Approve(),
    )

    total_amount = Btoi(Txn.application_args[1])
    platform_fee = (total_amount * fee_bps) / bps_denominator
    creator_amount = total_amount - platform_fee

    settle_reward = Seq(
        Assert(is_admin),
        Assert(Txn.application_args.length() >= Int(2)),
        Assert(Txn.assets[0] == App.globalGet(token_key)),
        Assert(Txn.accounts.length() >= Int(1)),
        Assert(total_amount > Int(0)),
        Assert(creator_amount > Int(0)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[0],
                TxnField.asset_receiver: Txn.accounts[1],
                TxnField.asset_amount: creator_amount,
            }
        ),
        InnerTxnBuilder.Submit(),
        If(platform_fee > Int(0)).Then(
            Seq(
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields(
                    {
                        TxnField.type_enum: TxnType.AssetTransfer,
                        TxnField.xfer_asset: Txn.assets[0],
                        TxnField.asset_receiver: App.globalGet(platform_key),
                        TxnField.asset_amount: platform_fee,
                    }
                ),
                InnerTxnBuilder.Submit(),
            )
        ),
        Approve(),
    )

    withdraw_unused = Seq(
        Assert(is_admin),
        Assert(Txn.application_args.length() >= Int(2)),
        Assert(Txn.assets[0] == App.globalGet(token_key)),
        Assert(Txn.accounts.length() >= Int(1)),
        Assert(Btoi(Txn.application_args[1]) > Int(0)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[0],
                TxnField.asset_receiver: Txn.accounts[1],
                TxnField.asset_amount: Btoi(Txn.application_args[1]),
            }
        ),
        InnerTxnBuilder.Submit(),
        Approve(),
    )

    return Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(is_admin)],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(is_admin)],
        [Txn.on_completion() == OnComplete.CloseOut, Approve()],
        [Txn.on_completion() == OnComplete.OptIn, Approve()],
        [Txn.application_args[0] == Bytes("set_config"), set_config],
        [Txn.application_args[0] == Bytes("optin_asset"), opt_in_asset],
        [Txn.application_args[0] == Bytes("deposit"), deposit],
        [Txn.application_args[0] == Bytes("settle_reward"), settle_reward],
        [Txn.application_args[0] == Bytes("withdraw_unused"), withdraw_unused],
    )


def clear_state_program():
    return Approve()


if __name__ == "__main__":
    with open("approval.teal", "w") as approval_file:
        approval_file.write(compileTeal(approval_program(), mode=Mode.Application, version=6))

    with open("clear.teal", "w") as clear_file:
        clear_file.write(compileTeal(clear_state_program(), mode=Mode.Application, version=6))
