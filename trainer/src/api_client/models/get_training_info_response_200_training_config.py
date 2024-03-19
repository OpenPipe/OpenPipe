from typing import TYPE_CHECKING, Any, Dict, List, Type, TypeVar, Union, cast

from attrs import define as _attrs_define

from ..models.get_training_info_response_200_training_config_adapter import (
    GetTrainingInfoResponse200TrainingConfigAdapter,
)
from ..models.get_training_info_response_200_training_config_model_type import (
    GetTrainingInfoResponse200TrainingConfigModelType,
)
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_training_info_response_200_training_config_datasets_item import (
        GetTrainingInfoResponse200TrainingConfigDatasetsItem,
    )
    from ..models.get_training_info_response_200_training_config_model_config import (
        GetTrainingInfoResponse200TrainingConfigModelConfig,
    )
    from ..models.get_training_info_response_200_training_config_special_tokens import (
        GetTrainingInfoResponse200TrainingConfigSpecialTokens,
    )


T = TypeVar("T", bound="GetTrainingInfoResponse200TrainingConfig")


@_attrs_define
class GetTrainingInfoResponse200TrainingConfig:
    """
    Attributes:
        model_type (GetTrainingInfoResponse200TrainingConfigModelType):
        tokenizer_type (str):
        load_in_8bit (bool):
        adapter (GetTrainingInfoResponse200TrainingConfigAdapter):
        sequence_len (float):
        sample_packing (bool):
        lora_r (float):
        lora_alpha (float):
        lora_dropout (float):
        lora_target_linear (bool):
        gradient_accumulation_steps (float):
        micro_batch_size (float):
        optimizer (str):
        lr_scheduler (str):
        learning_rate (float):
        train_on_inputs (bool):
        group_by_length (bool):
        bf16 (bool):
        fp16 (bool):
        tf32 (bool):
        gradient_checkpointing (bool):
        flash_attention (bool):
        warmup_steps (float):
        weight_decay (float):
        special_tokens (GetTrainingInfoResponse200TrainingConfigSpecialTokens):
        base_model (str):
        datasets (List['GetTrainingInfoResponse200TrainingConfigDatasetsItem']):
        val_set_size (float):
        num_epochs (float):
        is_llama_derived_model (Union[Unset, bool]):
        is_mistral_derived_model (Union[Unset, bool]):
        load_in_4bit (Union[Unset, bool]):
        model_config (Union[Unset, GetTrainingInfoResponse200TrainingConfigModelConfig]):
        eval_sample_packing (Union[Unset, bool]):
        pad_to_sequence_len (Union[Unset, bool]):
        lora_target_modules (Union[Unset, List[str]]):
        base_model_config (Union[Unset, str]):
        dataset_processes (Union[Unset, float]):
        output_dir (Union[Unset, str]):
        wandb_project (Union[Unset, str]):
        wandb_run_id (Union[Unset, str]):
        logging_steps (Union[Unset, float]):
        save_safetensors (Union[Unset, bool]):
        eval_steps (Union[Unset, float]):
        strict (Union[Unset, bool]):
        save_strategy (Union[Unset, str]):
        deepspeed (Union[Unset, str]):
    """

    model_type: GetTrainingInfoResponse200TrainingConfigModelType
    tokenizer_type: str
    load_in_8bit: bool
    adapter: GetTrainingInfoResponse200TrainingConfigAdapter
    sequence_len: float
    sample_packing: bool
    lora_r: float
    lora_alpha: float
    lora_dropout: float
    lora_target_linear: bool
    gradient_accumulation_steps: float
    micro_batch_size: float
    optimizer: str
    lr_scheduler: str
    learning_rate: float
    train_on_inputs: bool
    group_by_length: bool
    bf16: bool
    fp16: bool
    tf32: bool
    gradient_checkpointing: bool
    flash_attention: bool
    warmup_steps: float
    weight_decay: float
    special_tokens: "GetTrainingInfoResponse200TrainingConfigSpecialTokens"
    base_model: str
    datasets: List["GetTrainingInfoResponse200TrainingConfigDatasetsItem"]
    val_set_size: float
    num_epochs: float
    is_llama_derived_model: Union[Unset, bool] = UNSET
    is_mistral_derived_model: Union[Unset, bool] = UNSET
    load_in_4bit: Union[Unset, bool] = UNSET
    model_config: Union[Unset, "GetTrainingInfoResponse200TrainingConfigModelConfig"] = UNSET
    eval_sample_packing: Union[Unset, bool] = UNSET
    pad_to_sequence_len: Union[Unset, bool] = UNSET
    lora_target_modules: Union[Unset, List[str]] = UNSET
    base_model_config: Union[Unset, str] = UNSET
    dataset_processes: Union[Unset, float] = UNSET
    output_dir: Union[Unset, str] = UNSET
    wandb_project: Union[Unset, str] = UNSET
    wandb_run_id: Union[Unset, str] = UNSET
    logging_steps: Union[Unset, float] = UNSET
    save_safetensors: Union[Unset, bool] = UNSET
    eval_steps: Union[Unset, float] = UNSET
    strict: Union[Unset, bool] = UNSET
    save_strategy: Union[Unset, str] = UNSET
    deepspeed: Union[Unset, str] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        model_type = self.model_type.value

        tokenizer_type = self.tokenizer_type
        load_in_8bit = self.load_in_8bit
        adapter = self.adapter.value

        sequence_len = self.sequence_len
        sample_packing = self.sample_packing
        lora_r = self.lora_r
        lora_alpha = self.lora_alpha
        lora_dropout = self.lora_dropout
        lora_target_linear = self.lora_target_linear
        gradient_accumulation_steps = self.gradient_accumulation_steps
        micro_batch_size = self.micro_batch_size
        optimizer = self.optimizer
        lr_scheduler = self.lr_scheduler
        learning_rate = self.learning_rate
        train_on_inputs = self.train_on_inputs
        group_by_length = self.group_by_length
        bf16 = self.bf16
        fp16 = self.fp16
        tf32 = self.tf32
        gradient_checkpointing = self.gradient_checkpointing
        flash_attention = self.flash_attention
        warmup_steps = self.warmup_steps
        weight_decay = self.weight_decay
        special_tokens = self.special_tokens.to_dict()

        base_model = self.base_model
        datasets = []
        for datasets_item_data in self.datasets:
            datasets_item = datasets_item_data.to_dict()

            datasets.append(datasets_item)

        val_set_size = self.val_set_size
        num_epochs = self.num_epochs
        is_llama_derived_model = self.is_llama_derived_model
        is_mistral_derived_model = self.is_mistral_derived_model
        load_in_4bit = self.load_in_4bit
        model_config: Union[Unset, Dict[str, Any]] = UNSET
        if not isinstance(self.model_config, Unset):
            model_config = self.model_config.to_dict()

        eval_sample_packing = self.eval_sample_packing
        pad_to_sequence_len = self.pad_to_sequence_len
        lora_target_modules: Union[Unset, List[str]] = UNSET
        if not isinstance(self.lora_target_modules, Unset):
            lora_target_modules = self.lora_target_modules

        base_model_config = self.base_model_config
        dataset_processes = self.dataset_processes
        output_dir = self.output_dir
        wandb_project = self.wandb_project
        wandb_run_id = self.wandb_run_id
        logging_steps = self.logging_steps
        save_safetensors = self.save_safetensors
        eval_steps = self.eval_steps
        strict = self.strict
        save_strategy = self.save_strategy
        deepspeed = self.deepspeed

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "model_type": model_type,
                "tokenizer_type": tokenizer_type,
                "load_in_8bit": load_in_8bit,
                "adapter": adapter,
                "sequence_len": sequence_len,
                "sample_packing": sample_packing,
                "lora_r": lora_r,
                "lora_alpha": lora_alpha,
                "lora_dropout": lora_dropout,
                "lora_target_linear": lora_target_linear,
                "gradient_accumulation_steps": gradient_accumulation_steps,
                "micro_batch_size": micro_batch_size,
                "optimizer": optimizer,
                "lr_scheduler": lr_scheduler,
                "learning_rate": learning_rate,
                "train_on_inputs": train_on_inputs,
                "group_by_length": group_by_length,
                "bf16": bf16,
                "fp16": fp16,
                "tf32": tf32,
                "gradient_checkpointing": gradient_checkpointing,
                "flash_attention": flash_attention,
                "warmup_steps": warmup_steps,
                "weight_decay": weight_decay,
                "special_tokens": special_tokens,
                "base_model": base_model,
                "datasets": datasets,
                "val_set_size": val_set_size,
                "num_epochs": num_epochs,
            }
        )
        if is_llama_derived_model is not UNSET:
            field_dict["is_llama_derived_model"] = is_llama_derived_model
        if is_mistral_derived_model is not UNSET:
            field_dict["is_mistral_derived_model"] = is_mistral_derived_model
        if load_in_4bit is not UNSET:
            field_dict["load_in_4bit"] = load_in_4bit
        if model_config is not UNSET:
            field_dict["model_config"] = model_config
        if eval_sample_packing is not UNSET:
            field_dict["eval_sample_packing"] = eval_sample_packing
        if pad_to_sequence_len is not UNSET:
            field_dict["pad_to_sequence_len"] = pad_to_sequence_len
        if lora_target_modules is not UNSET:
            field_dict["lora_target_modules"] = lora_target_modules
        if base_model_config is not UNSET:
            field_dict["base_model_config"] = base_model_config
        if dataset_processes is not UNSET:
            field_dict["dataset_processes"] = dataset_processes
        if output_dir is not UNSET:
            field_dict["output_dir"] = output_dir
        if wandb_project is not UNSET:
            field_dict["wandb_project"] = wandb_project
        if wandb_run_id is not UNSET:
            field_dict["wandb_run_id"] = wandb_run_id
        if logging_steps is not UNSET:
            field_dict["logging_steps"] = logging_steps
        if save_safetensors is not UNSET:
            field_dict["save_safetensors"] = save_safetensors
        if eval_steps is not UNSET:
            field_dict["eval_steps"] = eval_steps
        if strict is not UNSET:
            field_dict["strict"] = strict
        if save_strategy is not UNSET:
            field_dict["save_strategy"] = save_strategy
        if deepspeed is not UNSET:
            field_dict["deepspeed"] = deepspeed

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.get_training_info_response_200_training_config_datasets_item import (
            GetTrainingInfoResponse200TrainingConfigDatasetsItem,
        )
        from ..models.get_training_info_response_200_training_config_model_config import (
            GetTrainingInfoResponse200TrainingConfigModelConfig,
        )
        from ..models.get_training_info_response_200_training_config_special_tokens import (
            GetTrainingInfoResponse200TrainingConfigSpecialTokens,
        )

        d = src_dict.copy()
        model_type = GetTrainingInfoResponse200TrainingConfigModelType(d.pop("model_type"))

        tokenizer_type = d.pop("tokenizer_type")

        load_in_8bit = d.pop("load_in_8bit")

        adapter = GetTrainingInfoResponse200TrainingConfigAdapter(d.pop("adapter"))

        sequence_len = d.pop("sequence_len")

        sample_packing = d.pop("sample_packing")

        lora_r = d.pop("lora_r")

        lora_alpha = d.pop("lora_alpha")

        lora_dropout = d.pop("lora_dropout")

        lora_target_linear = d.pop("lora_target_linear")

        gradient_accumulation_steps = d.pop("gradient_accumulation_steps")

        micro_batch_size = d.pop("micro_batch_size")

        optimizer = d.pop("optimizer")

        lr_scheduler = d.pop("lr_scheduler")

        learning_rate = d.pop("learning_rate")

        train_on_inputs = d.pop("train_on_inputs")

        group_by_length = d.pop("group_by_length")

        bf16 = d.pop("bf16")

        fp16 = d.pop("fp16")

        tf32 = d.pop("tf32")

        gradient_checkpointing = d.pop("gradient_checkpointing")

        flash_attention = d.pop("flash_attention")

        warmup_steps = d.pop("warmup_steps")

        weight_decay = d.pop("weight_decay")

        special_tokens = GetTrainingInfoResponse200TrainingConfigSpecialTokens.from_dict(d.pop("special_tokens"))

        base_model = d.pop("base_model")

        datasets = []
        _datasets = d.pop("datasets")
        for datasets_item_data in _datasets:
            datasets_item = GetTrainingInfoResponse200TrainingConfigDatasetsItem.from_dict(datasets_item_data)

            datasets.append(datasets_item)

        val_set_size = d.pop("val_set_size")

        num_epochs = d.pop("num_epochs")

        is_llama_derived_model = d.pop("is_llama_derived_model", UNSET)

        is_mistral_derived_model = d.pop("is_mistral_derived_model", UNSET)

        load_in_4bit = d.pop("load_in_4bit", UNSET)

        _model_config = d.pop("model_config", UNSET)
        model_config: Union[Unset, GetTrainingInfoResponse200TrainingConfigModelConfig]
        if isinstance(_model_config, Unset):
            model_config = UNSET
        else:
            model_config = GetTrainingInfoResponse200TrainingConfigModelConfig.from_dict(_model_config)

        eval_sample_packing = d.pop("eval_sample_packing", UNSET)

        pad_to_sequence_len = d.pop("pad_to_sequence_len", UNSET)

        lora_target_modules = cast(List[str], d.pop("lora_target_modules", UNSET))

        base_model_config = d.pop("base_model_config", UNSET)

        dataset_processes = d.pop("dataset_processes", UNSET)

        output_dir = d.pop("output_dir", UNSET)

        wandb_project = d.pop("wandb_project", UNSET)

        wandb_run_id = d.pop("wandb_run_id", UNSET)

        logging_steps = d.pop("logging_steps", UNSET)

        save_safetensors = d.pop("save_safetensors", UNSET)

        eval_steps = d.pop("eval_steps", UNSET)

        strict = d.pop("strict", UNSET)

        save_strategy = d.pop("save_strategy", UNSET)

        deepspeed = d.pop("deepspeed", UNSET)

        get_training_info_response_200_training_config = cls(
            model_type=model_type,
            tokenizer_type=tokenizer_type,
            load_in_8bit=load_in_8bit,
            adapter=adapter,
            sequence_len=sequence_len,
            sample_packing=sample_packing,
            lora_r=lora_r,
            lora_alpha=lora_alpha,
            lora_dropout=lora_dropout,
            lora_target_linear=lora_target_linear,
            gradient_accumulation_steps=gradient_accumulation_steps,
            micro_batch_size=micro_batch_size,
            optimizer=optimizer,
            lr_scheduler=lr_scheduler,
            learning_rate=learning_rate,
            train_on_inputs=train_on_inputs,
            group_by_length=group_by_length,
            bf16=bf16,
            fp16=fp16,
            tf32=tf32,
            gradient_checkpointing=gradient_checkpointing,
            flash_attention=flash_attention,
            warmup_steps=warmup_steps,
            weight_decay=weight_decay,
            special_tokens=special_tokens,
            base_model=base_model,
            datasets=datasets,
            val_set_size=val_set_size,
            num_epochs=num_epochs,
            is_llama_derived_model=is_llama_derived_model,
            is_mistral_derived_model=is_mistral_derived_model,
            load_in_4bit=load_in_4bit,
            model_config=model_config,
            eval_sample_packing=eval_sample_packing,
            pad_to_sequence_len=pad_to_sequence_len,
            lora_target_modules=lora_target_modules,
            base_model_config=base_model_config,
            dataset_processes=dataset_processes,
            output_dir=output_dir,
            wandb_project=wandb_project,
            wandb_run_id=wandb_run_id,
            logging_steps=logging_steps,
            save_safetensors=save_safetensors,
            eval_steps=eval_steps,
            strict=strict,
            save_strategy=save_strategy,
            deepspeed=deepspeed,
        )

        return get_training_info_response_200_training_config
